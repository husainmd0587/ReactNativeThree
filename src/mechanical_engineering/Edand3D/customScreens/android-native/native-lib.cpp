// native-lib.cpp
#include <jni.h>
#include <vector>
#include <cmath>
#include <android/log.h>
#include <manifold/manifold.h>

using namespace manifold;

#define LOG_TAG "NativeCSG"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static Manifold g_stock;
static bool     g_stockValid = false;

// Each cut that specifies a material gets an originalID slot here.
// slot 0 = stock faces (always)
// slot N = cut N's exposed faces
static std::vector<uint32_t> g_cutOriginalIDs;   // originalID for each cut slot (index = slot)

// ════════════════════════════════════════════════════════════════════════════
// BUILD MANIFOLD FROM VERTS + INDICES  —  with an assigned originalID
// ════════════════════════════════════════════════════════════════════════════

static Manifold buildManifoldSafe(JNIEnv* env, jfloatArray jVerts, jintArray jInds,
                                   uint32_t originalID = 0)
{
    if (!jVerts || !jInds) { LOGE("buildManifoldSafe: null"); return Manifold(); }

    jsize vLen = env->GetArrayLength(jVerts);
    jsize iLen = env->GetArrayLength(jInds);

    if (vLen < 9 || iLen < 3 || vLen % 3 != 0 || iLen % 3 != 0) {
        LOGE("buildManifoldSafe: bad stride v=%d i=%d", (int)vLen, (int)iLen);
        return Manifold();
    }

    jfloat* vData = env->GetFloatArrayElements(jVerts, nullptr);
    jint*   iData = env->GetIntArrayElements(jInds,   nullptr);

    std::vector<float>    verts(vData, vData + vLen);
    std::vector<uint32_t> indices(iLen);
    for (jsize i = 0; i < iLen; i++)
        indices[i] = static_cast<uint32_t>(iData[i] < 0 ? 0 : iData[i]);

    env->ReleaseFloatArrayElements(jVerts, vData, JNI_ABORT);
    env->ReleaseIntArrayElements(jInds,   iData, JNI_ABORT);

    MeshGL mesh;
    mesh.numProp        = 3;
    mesh.vertProperties = verts;
    mesh.triVerts       = indices;

    // Tag every face of this mesh with the given originalID
    uint32_t numTris = (uint32_t)(iLen / 3);
    mesh.faceID.resize(numTris, originalID);

    Manifold m(mesh);
    if (m.Status() != Manifold::Error::NoError) {
        LOGE("buildManifoldSafe: status=%d", (int)m.Status());
        return Manifold();
    }
    LOGI("Mesh OK: %d verts %d tris originalID=%u", (int)m.NumVert(), (int)m.NumTri(), originalID);
    return m;
}

// ════════════════════════════════════════════════════════════════════════════
// CONVERT MANIFOLD → JAVA  Object[]{ float[] verts, int[] indices, int[] faceIDs }
// faceIDs[i] = originalID of triangle i  → used in JS to build draw groups
// ════════════════════════════════════════════════════════════════════════════

static jobject manifoldToJavaSafe(JNIEnv* env, const Manifold& m)
{
    jclass       cls    = env->FindClass("java/lang/Object");
    jobjectArray result = env->NewObjectArray(3, cls, nullptr);  // now 3 elements

    if (m.Status() != Manifold::Error::NoError || m.NumVert() == 0 || m.NumTri() == 0) {
        LOGE("manifoldToJavaSafe: bad manifold status=%d v=%d t=%d",
             (int)m.Status(), (int)m.NumVert(), (int)m.NumTri());
        return result;
    }

    MeshGL mesh = m.GetMeshGL();

    // verts
    jfloatArray vOut = env->NewFloatArray((jsize)mesh.vertProperties.size());
    env->SetFloatArrayRegion(vOut, 0, (jsize)mesh.vertProperties.size(),
                             mesh.vertProperties.data());

    // indices
    std::vector<jint> iTemp(mesh.triVerts.size());
    for (size_t i = 0; i < mesh.triVerts.size(); i++) iTemp[i] = (jint)mesh.triVerts[i];
    jintArray iOut = env->NewIntArray((jsize)iTemp.size());
    env->SetIntArrayRegion(iOut, 0, (jsize)iTemp.size(), iTemp.data());

    // faceIDs — one per triangle
    std::vector<jint> fTemp(mesh.faceID.size());
    for (size_t i = 0; i < mesh.faceID.size(); i++) fTemp[i] = (jint)mesh.faceID[i];
    jintArray fOut = env->NewIntArray((jsize)fTemp.size());
    env->SetIntArrayRegion(fOut, 0, (jsize)fTemp.size(), fTemp.data());

    env->SetObjectArrayElement(result, 0, vOut);
    env->SetObjectArrayElement(result, 1, iOut);
    env->SetObjectArrayElement(result, 2, fOut);   // ← new
    return result;
}

// ════════════════════════════════════════════════════════════════════════════
// REVOLVE PROFILE → MANIFOLD
// ════════════════════════════════════════════════════════════════════════════

static Manifold buildRevolveManifold(const float* profile, int pts, int segments,
                                      float revolveDegrees, uint32_t originalID = 0)
{
    if (pts < 3) return Manifold();
    if (segments < 32) segments = 32;
    if (revolveDegrees <= 0.f || revolveDegrees > 360.f) revolveDegrees = 360.f;

    SimplePolygon poly;
    poly.reserve((size_t)pts);
    for (int i = 0; i < pts; i++)
        poly.push_back({ profile[i*2] < 0.f ? 0.f : profile[i*2], profile[i*2+1] });

    Polygons polygons;
    polygons.push_back(poly);

    // NOTE: if your pinned Manifold version's Revolve() doesn't take a third
    // (degrees) argument, drop it here and revolveDegrees will have no
    // effect other than the >360 clamp above (always a full revolve).
    Manifold m = Manifold::Revolve(polygons, segments, revolveDegrees);
    if (m.Status() != Manifold::Error::NoError) {
        LOGE("buildRevolveManifold: failed status=%d", (int)m.Status());
        return Manifold();
    }

    // Tag faces
    MeshGL mesh = m.GetMeshGL();
    mesh.faceID.assign(mesh.triVerts.size() / 3, originalID);
    m = Manifold(mesh);

    LOGI("Revolve OK: %d verts %d tris degrees=%.1f originalID=%u",
         (int)m.NumVert(), (int)m.NumTri(), revolveDegrees, originalID);
    return m;
}

// ════════════════════════════════════════════════════════════════════════════
// EXTRUDE PROFILE (possibly multi-loop) → MANIFOLD
//
// Linear extrusion counterpart to buildRevolveManifold above. Takes a flat,
// tessellated point list plus a loop-size table describing how many points
// belong to each loop — loop 0 is always the outer boundary, every loop
// after that is a hole inside it. This is what makes "outer boundary + inner
// holes -> one solid" possible without a separate boolean cut per hole.
//
// Caller (JS side, utils/profile/loopDetection.js) is responsible for
// winding each loop correctly: outer CCW, holes CW (opposite winding),
// which is the convention Manifold's polygon-with-holes representation
// expects.
// ════════════════════════════════════════════════════════════════════════════

static Manifold buildExtrudeManifold(const float* pointsFlat, const int* loopSizes, int loopCount,
                                      float height, uint32_t originalID = 0)
{
    if (loopCount < 1) return Manifold();
    if (height <= 0.f) return Manifold();

    Polygons polygons;
    int offset = 0;

    for (int L = 0; L < loopCount; L++) {
        int n = loopSizes[L];
        if (n < 3) {
            LOGE("buildExtrudeManifold: loop %d has fewer than 3 points", L);
            return Manifold();
        }

        SimplePolygon poly;
        poly.reserve((size_t)n);
        for (int i = 0; i < n; i++) {
            poly.push_back({ pointsFlat[(offset + i) * 2], pointsFlat[(offset + i) * 2 + 1] });
        }
        polygons.push_back(poly);
        offset += n;
    }

    Manifold m = Manifold::Extrude(polygons, height);
    if (m.Status() != Manifold::Error::NoError) {
        LOGE("buildExtrudeManifold: failed status=%d", (int)m.Status());
        return Manifold();
    }

    // Tag faces
    MeshGL mesh = m.GetMeshGL();
    mesh.faceID.assign(mesh.triVerts.size() / 3, originalID);
    m = Manifold(mesh);

    LOGI("Extrude OK: %d loops %d verts %d tris originalID=%u",
         loopCount, (int)m.NumVert(), (int)m.NumTri(), originalID);
    return m;
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSFORM HELPER
// ════════════════════════════════════════════════════════════════════════════

static Manifold applyTransform(
    Manifold m,
    float tx, float ty, float tz,
    float rx, float ry, float rz,
    float sx = 1.f, float sy = 1.f, float sz = 1.f)
{
    if (sx != 1.f || sy != 1.f || sz != 1.f) m = m.Scale({sx, sy, sz});
    if (rx != 0.f) m = m.Rotate(rx, 0.f, 0.f);
    if (ry != 0.f) m = m.Rotate(0.f, ry, 0.f);
    if (rz != 0.f) m = m.Rotate(0.f, 0.f, rz);
    if (tx != 0.f || ty != 0.f || tz != 0.f) m = m.Translate({tx, ty, tz});
    return m;
}

// Stock always gets originalID = 0.
// Each cut tool gets a unique originalID = 1, 2, 3 ...
// We track the next available ID here.
static uint32_t g_nextID = 1;

// ════════════════════════════════════════════════════════════════════════════
// JNI — initStock  (from raw mesh)
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStock(
    JNIEnv* env, jobject, jfloatArray stockVerts, jintArray stockInds)
{
    g_nextID     = 1;
    g_stock      = buildManifoldSafe(env, stockVerts, stockInds, /*originalID=*/0);
    g_stockValid = g_stock.Status() == Manifold::Error::NoError && g_stock.NumVert() > 0;
    LOGI("initStock: valid=%d", g_stockValid);
    return g_stockValid ? JNI_TRUE : JNI_FALSE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — initStockBox
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockBox(
    JNIEnv*, jobject, jfloat w, jfloat h, jfloat d)
{
    if (w <= 0.f || h <= 0.f || d <= 0.f) { g_stockValid = false; return JNI_FALSE; }
    g_nextID = 1;

    // Build cube, tag all faces as originalID=0 (stock)
    Manifold raw = Manifold::Cube({w, h, d}, true).Rotate(90.f, 0.f, 0.f);
    MeshGL mesh  = raw.GetMeshGL();
    mesh.faceID.assign(mesh.triVerts.size() / 3, 0u);
    g_stock      = Manifold(mesh);
    g_stockValid = g_stock.Status() == Manifold::Error::NoError && g_stock.NumVert() > 0;
    LOGI("initStockBox: valid=%d verts=%d tris=%d",
         g_stockValid, (int)g_stock.NumVert(), (int)g_stock.NumTri());
    return g_stockValid ? JNI_TRUE : JNI_FALSE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — initStockCylinder
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockCylinder(
    JNIEnv*, jobject, jfloat radius, jfloat height, jint segments)
{
    if (radius <= 0.f || height <= 0.f) { g_stockValid = false; return JNI_FALSE; }
    if (segments < 32) segments = 32;
    g_nextID = 1;

    Manifold raw = Manifold::Cylinder(height, radius, radius, (int)segments).Rotate(90.f, 0.f, 0.f).Translate({0.f, height/2, 0.f});
    MeshGL mesh  = raw.GetMeshGL();
    mesh.faceID.assign(mesh.triVerts.size() / 3, 0u);
    g_stock      = Manifold(mesh);
    g_stockValid = g_stock.Status() == Manifold::Error::NoError && g_stock.NumVert() > 0;
    LOGI("initStockCylinder: valid=%d verts=%d", g_stockValid, (int)g_stock.NumVert());
    return g_stockValid ? JNI_TRUE : JNI_FALSE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — initStockFromProfile
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockFromProfile(
    JNIEnv* env, jobject, jfloatArray jProfile, jint segments, jfloat revolveDegrees)
{
    if (!jProfile) { g_stockValid = false; return JNI_FALSE; }
    if (segments < 32) segments = 32;
    jsize pLen = env->GetArrayLength(jProfile);
    if (pLen < 6 || pLen % 2 != 0) { g_stockValid = false; return JNI_FALSE; }

    jfloat* pData = env->GetFloatArrayElements(jProfile, nullptr);
    g_nextID = 1;
    g_stock  = buildRevolveManifold(pData, (int)(pLen / 2), (int)segments, revolveDegrees, /*originalID=*/0);
    env->ReleaseFloatArrayElements(jProfile, pData, JNI_ABORT);

    g_stockValid = g_stock.Status() == Manifold::Error::NoError && g_stock.NumVert() > 0;
    LOGI("initStockFromProfile: valid=%d verts=%d tris=%d",
         g_stockValid, (int)g_stock.NumVert(), (int)g_stock.NumTri());
    return g_stockValid ? JNI_TRUE : JNI_FALSE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — initStockFromExtrudeProfile
//
// Same role as initStockFromProfile above, but for linear extrusion instead
// of revolution. This is the native-side replacement for building the base
// solid straight from a closed 2D sketch, instead of extruding client-side
// with THREE.js and converting the result back into a mesh.
//
// jProfile:   flat [x,y,x,y,...] points for ALL loops concatenated in order.
// jLoopSizes: point count per loop — loopSizes[0] is the outer boundary,
//             every entry after that is a hole. Pass a single-entry array
//             for a plain profile with no holes.
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockFromExtrudeProfile(
    JNIEnv* env, jobject, jfloatArray jProfile, jintArray jLoopSizes, jfloat height)
{
    if (!jProfile || !jLoopSizes) { g_stockValid = false; return JNI_FALSE; }
    if (height <= 0.f) { g_stockValid = false; return JNI_FALSE; }

    jsize pLen = env->GetArrayLength(jProfile);
    jsize loopCount = env->GetArrayLength(jLoopSizes);
    if (pLen < 6 || pLen % 2 != 0 || loopCount < 1) { g_stockValid = false; return JNI_FALSE; }

    jfloat* pData = env->GetFloatArrayElements(jProfile, nullptr);
    jint*   lData = env->GetIntArrayElements(jLoopSizes, nullptr);

    std::vector<int> loopSizes(lData, lData + loopCount);

    g_nextID = 1;
    g_stock  = buildExtrudeManifold(pData, loopSizes.data(), (int)loopCount, height, /*originalID=*/0);

    env->ReleaseFloatArrayElements(jProfile, pData, JNI_ABORT);
    env->ReleaseIntArrayElements(jLoopSizes, lData, JNI_ABORT);

    g_stockValid = g_stock.Status() == Manifold::Error::NoError && g_stock.NumVert() > 0;
    LOGI("initStockFromExtrudeProfile: valid=%d loops=%d verts=%d tris=%d",
         g_stockValid, (int)loopCount, (int)g_stock.NumVert(), (int)g_stock.NumTri());
    return g_stockValid ? JNI_TRUE : JNI_FALSE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — applyMeshToolWithTransform
//
// op:    0 = subtract (A - B)
//        1 = union    (A + B)
//        2 = intersect(A ^ B)
// hasMaterial: 1 if this cut has a material override, 0 if not.
//              When 1, the tool is tagged with a fresh originalID so the JS
//              side can identify which triangles came from this cut.
//              Returns the assigned originalID in the result map so JS knows
//              which faceID to associate with this cut's material.
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyMeshToolWithTransform(
    JNIEnv* env, jobject,
    jfloatArray toolVerts, jintArray toolInds,
    jfloat tx, jfloat ty, jfloat tz,
    jfloat rx, jfloat ry, jfloat rz,
    jfloat sx, jfloat sy, jfloat sz,
    jint   op,
    jint   hasMaterial)   // ← new param
{
    if (!g_stockValid) {
        LOGE("applyMeshToolWithTransform: no stock");
        return manifoldToJavaSafe(env, Manifold());
    }

    // Assign a unique originalID to this tool if it has a material
    uint32_t toolID = hasMaterial ? g_nextID++ : 0u;

    Manifold tool = buildManifoldSafe(env, toolVerts, toolInds, toolID);
    if (tool.Status() != Manifold::Error::NoError) {
        LOGE("applyMeshToolWithTransform: bad tool");
        return manifoldToJavaSafe(env, Manifold());
    }

    tool = applyTransform(tool, tx, ty, tz, rx, ry, rz, sx, sy, sz);

    switch (op) {
        case 1:  LOGI("op: UNION");     g_stock = g_stock + tool; break;
        case 2:  LOGI("op: INTERSECT"); g_stock = g_stock ^ tool; break;
        default: LOGI("op: SUBTRACT");  g_stock = g_stock - tool; break;
    }

    if (g_stock.Status() != Manifold::Error::NoError) {
        LOGE("applyMeshToolWithTransform: op failed status=%d", (int)g_stock.Status());
        g_stockValid = false;
        return manifoldToJavaSafe(env, Manifold());
    }

    LOGI("result: %d verts %d tris toolID=%u", (int)g_stock.NumVert(), (int)g_stock.NumTri(), toolID);

    // Return mesh + faceIDs.  The Java/JS side will find triangles tagged
    // with toolID and put them in a separate draw group with this cut's material.
    // We pack toolID as element [3] of the result array so JS can read it.
    jclass       cls    = env->FindClass("java/lang/Object");
    jobjectArray result = env->NewObjectArray(4, cls, nullptr);  // 4 elements

    MeshGL mesh = g_stock.GetMeshGL();

    jfloatArray vOut = env->NewFloatArray((jsize)mesh.vertProperties.size());
    env->SetFloatArrayRegion(vOut, 0, (jsize)mesh.vertProperties.size(),
                             mesh.vertProperties.data());

    std::vector<jint> iTemp(mesh.triVerts.size());
    for (size_t i = 0; i < mesh.triVerts.size(); i++) iTemp[i] = (jint)mesh.triVerts[i];
    jintArray iOut = env->NewIntArray((jsize)iTemp.size());
    env->SetIntArrayRegion(iOut, 0, (jsize)iTemp.size(), iTemp.data());

    std::vector<jint> fTemp(mesh.faceID.size());
    for (size_t i = 0; i < mesh.faceID.size(); i++) fTemp[i] = (jint)mesh.faceID[i];
    jintArray fOut = env->NewIntArray((jsize)fTemp.size());
    env->SetIntArrayRegion(fOut, 0, (jsize)fTemp.size(), fTemp.data());

    // toolID as a single-element int array
    jintArray tidOut = env->NewIntArray(1);
    jint tid = (jint)toolID;
    env->SetIntArrayRegion(tidOut, 0, 1, &tid);

    env->SetObjectArrayElement(result, 0, vOut);
    env->SetObjectArrayElement(result, 1, iOut);
    env->SetObjectArrayElement(result, 2, fOut);
    env->SetObjectArrayElement(result, 3, tidOut);
    return result;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — applyLatheProfile
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyLatheProfile(
    JNIEnv* env, jobject,
    jfloatArray jProfile, jint segments,
    jfloat tx, jfloat ty, jfloat tz,
    jfloat rx, jfloat ry, jfloat rz)
{
    if (!g_stockValid) return manifoldToJavaSafe(env, Manifold());
    jsize pLen = env->GetArrayLength(jProfile);
    if (!jProfile || pLen < 6 || pLen % 2 != 0) return manifoldToJavaSafe(env, Manifold());
    if (segments < 32) segments = 32;

    jfloat* pData = env->GetFloatArrayElements(jProfile, nullptr);
    Manifold tool = buildRevolveManifold(pData, (int)(pLen / 2), (int)segments, 360.f, 0u);
    env->ReleaseFloatArrayElements(jProfile, pData, JNI_ABORT);

    if (tool.Status() != Manifold::Error::NoError) return manifoldToJavaSafe(env, Manifold());

    tool    = applyTransform(tool, tx, ty, tz, rx, ry, rz);
    g_stock = g_stock - tool;

    if (g_stock.Status() != Manifold::Error::NoError) {
        g_stockValid = false;
        return manifoldToJavaSafe(env, Manifold());
    }
    return manifoldToJavaSafe(env, g_stock);
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — applyExtrudeProfile
//
// Extrude counterpart to applyLatheProfile: builds an extruded solid from a
// profile and subtracts (or otherwise combines) it into the current stock in
// one call — e.g. punching a non-circular (slotted, hex, etc) hole through
// a solid without having to build that tool shape as a raw mesh in JS first.
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyExtrudeProfile(
    JNIEnv* env, jobject,
    jfloatArray jProfile, jintArray jLoopSizes, jfloat height,
    jfloat tx, jfloat ty, jfloat tz,
    jfloat rx, jfloat ry, jfloat rz,
    jint   op)
{
    if (!g_stockValid) return manifoldToJavaSafe(env, Manifold());
    if (!jProfile || !jLoopSizes) return manifoldToJavaSafe(env, Manifold());

    jsize pLen = env->GetArrayLength(jProfile);
    jsize loopCount = env->GetArrayLength(jLoopSizes);
    if (pLen < 6 || pLen % 2 != 0 || loopCount < 1) return manifoldToJavaSafe(env, Manifold());

    jfloat* pData = env->GetFloatArrayElements(jProfile, nullptr);
    jint*   lData = env->GetIntArrayElements(jLoopSizes, nullptr);
    std::vector<int> loopSizes(lData, lData + loopCount);

    Manifold tool = buildExtrudeManifold(pData, loopSizes.data(), (int)loopCount, height, 0u);

    env->ReleaseFloatArrayElements(jProfile, pData, JNI_ABORT);
    env->ReleaseIntArrayElements(jLoopSizes, lData, JNI_ABORT);

    if (tool.Status() != Manifold::Error::NoError) return manifoldToJavaSafe(env, Manifold());

    tool = applyTransform(tool, tx, ty, tz, rx, ry, rz);

    switch (op) {
        case 1:  LOGI("applyExtrudeProfile op: UNION");     g_stock = g_stock + tool; break;
        case 2:  LOGI("applyExtrudeProfile op: INTERSECT"); g_stock = g_stock ^ tool; break;
        default: LOGI("applyExtrudeProfile op: SUBTRACT");  g_stock = g_stock - tool; break;
    }

    if (g_stock.Status() != Manifold::Error::NoError) {
        g_stockValid = false;
        return manifoldToJavaSafe(env, Manifold());
    }
    return manifoldToJavaSafe(env, g_stock);
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — applyMeshToolBatch
//
// PERFORMANCE PATH for patterned features (e.g. a bolt circle of 20-50
// holes). Applying N holes through applyMeshToolWithTransform means N
// separate JNI round-trips AND N full mesh marshals (verts+indices+faceIDs)
// back to JS, one per hole, even though only the FINAL result is ever
// actually needed. This function takes ONE tool mesh + a flat array of
// per-instance transforms and loops entirely in native code, marshaling the
// result mesh back to JS exactly once no matter how many instances there are.
//
// transforms: flattened, 9 floats per instance, in order:
//             tx, ty, tz, rx, ry, rz, sx, sy, sz
// op:         0 = subtract, 1 = union, 2 = intersect — applied to EVERY
//             instance the same way (e.g. a hole pattern is always 0).
// hasMaterial: 1 if every instance should get its own fresh originalID
//              (so JS can still color/identify individual cut faces), 0 if
//              the cuts don't need per-instance face tagging.
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyMeshToolBatch(
    JNIEnv* env, jobject,
    jfloatArray toolVerts, jintArray toolInds,
    jfloatArray transforms,
    jint   op,
    jint   hasMaterial)
{
    if (!g_stockValid) {
        LOGE("applyMeshToolBatch: no stock");
        return manifoldToJavaSafe(env, Manifold());
    }

    if (!transforms) return manifoldToJavaSafe(env, Manifold());
    jsize tLen = env->GetArrayLength(transforms);
    if (tLen <= 0 || tLen % 9 != 0) {
        LOGE("applyMeshToolBatch: bad transforms length %d (must be a multiple of 9)", (int)tLen);
        return manifoldToJavaSafe(env, Manifold());
    }
    jsize count = tLen / 9;

    // Build the base tool ONCE — every instance is a transformed copy of it.
    Manifold baseTool = buildManifoldSafe(env, toolVerts, toolInds, 0);
    if (baseTool.Status() != Manifold::Error::NoError) {
        LOGE("applyMeshToolBatch: bad tool");
        return manifoldToJavaSafe(env, Manifold());
    }

    jfloat* tData = env->GetFloatArrayElements(transforms, nullptr);

    for (jsize i = 0; i < count; i++) {
        const jfloat* t = tData + (i * 9);

        Manifold tool = baseTool;

        if (hasMaterial) {
            uint32_t instID = g_nextID++;
            MeshGL mesh = tool.GetMeshGL();
            mesh.faceID.assign(mesh.triVerts.size() / 3, instID);
            tool = Manifold(mesh);
        }

        tool = applyTransform(tool, t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8]);

        switch (op) {
            case 1:  g_stock = g_stock + tool; break;
            case 2:  g_stock = g_stock ^ tool; break;
            default: g_stock = g_stock - tool; break;
        }

        if (g_stock.Status() != Manifold::Error::NoError) {
            LOGE("applyMeshToolBatch: op failed at instance %d status=%d", (int)i, (int)g_stock.Status());
            g_stockValid = false;
            env->ReleaseFloatArrayElements(transforms, tData, JNI_ABORT);
            return manifoldToJavaSafe(env, Manifold());
        }
    }

    env->ReleaseFloatArrayElements(transforms, tData, JNI_ABORT);

    LOGI("applyMeshToolBatch: applied %d instances -> %d verts %d tris",
         (int)count, (int)g_stock.NumVert(), (int)g_stock.NumTri());

    return manifoldToJavaSafe(env, g_stock);
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — translateStock
//
// Moves the current stock in place. Used by the JS side to implement
// "reverse direction" and "symmetric" extrude (both are just a translate of
// the already-extruded solid — extrude always builds from Z=0 upward, reverse
// shifts it to end at Z=0 instead of start there, symmetric centers it).
// Also generally useful for a future "move body" feature.
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_translateStock(
    JNIEnv*, jobject, jfloat tx, jfloat ty, jfloat tz)
{
    if (!g_stockValid) { LOGE("translateStock: no stock"); return JNI_FALSE; }

    g_stock = g_stock.Translate({tx, ty, tz});

    if (g_stock.Status() != Manifold::Error::NoError) {
        LOGE("translateStock: failed status=%d", (int)g_stock.Status());
        g_stockValid = false;
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — getStock
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_getStock(JNIEnv* env, jobject)
{
    if (!g_stockValid) { LOGE("getStock: no stock"); return manifoldToJavaSafe(env, Manifold()); }
    return manifoldToJavaSafe(env, g_stock);
}

// ════════════════════════════════════════════════════════════════════════════
// JNI — resetStock
// ════════════════════════════════════════════════════════════════════════════

extern "C" JNIEXPORT void JNICALL
Java_com_threeapp_NativeCSG_resetStock(JNIEnv*, jobject)
{
    g_stock      = Manifold();
    g_stockValid = false;
    g_nextID     = 1;
    LOGI("resetStock: cleared");
}
