#include <jni.h>
#include <vector>
#include <cmath>
#include <string>
#include <android/log.h>

// ── Manifold ──────────────────────────────────────────────────────────────
#include "manifold/manifold.h"
using namespace manifold;

#define LOG_TAG "NativeLib"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif


// ════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — LATHE GENERATION
// ════════════════════════════════════════════════════════════════════════════

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeTestModule_generateLathe(
        JNIEnv *env,
        jobject,
        jfloatArray profileArray,
        jint profileCount,
        jint segments
) {
    if (!profileArray || profileCount < 2 || segments < 3) return nullptr;

    jfloat* profile = env->GetFloatArrayElements(profileArray, nullptr);
    if (!profile) return nullptr;

    std::vector<float> vertices;
    std::vector<float> uvs;
    std::vector<jint>  indices;

    vertices.reserve(profileCount * segments * 3);
    uvs.reserve(profileCount * segments * 2);
    indices.reserve((profileCount - 1) * segments * 6);

    for (int i = 0; i < profileCount; i++) {
        float y = profile[i * 2];
        float r = profile[i * 2 + 1];
        float v = (float)i / (profileCount - 1);

        for (int j = 0; j < segments; j++) {
            float u     = (float)j / segments;
            float theta = (2.0f * (float)M_PI * j) / segments;
            float x     = r * cosf(theta);
            float z     = r * sinf(theta);

            vertices.push_back(x);
            vertices.push_back(y);
            vertices.push_back(z);
            uvs.push_back(u);
            uvs.push_back(v);
        }
    }

    for (int i = 0; i < profileCount - 1; i++) {
        for (int j = 0; j < segments; j++) {
            int next = (j + 1) % segments;
            int a = i       * segments + j;
            int b = i       * segments + next;
            int c = (i + 1) * segments + j;
            int d = (i + 1) * segments + next;

            indices.push_back(a); indices.push_back(b); indices.push_back(d);
            indices.push_back(a); indices.push_back(d); indices.push_back(c);
        }
    }

    env->ReleaseFloatArrayElements(profileArray, profile, JNI_ABORT);

    jfloatArray  vertexArray = env->NewFloatArray((jsize)vertices.size());
    env->SetFloatArrayRegion(vertexArray, 0, (jsize)vertices.size(), vertices.data());

    jfloatArray  uvArray = env->NewFloatArray((jsize)uvs.size());
    env->SetFloatArrayRegion(uvArray, 0, (jsize)uvs.size(), uvs.data());

    jintArray    indexArray = env->NewIntArray((jsize)indices.size());
    env->SetIntArrayRegion(indexArray, 0, (jsize)indices.size(), indices.data());

    jclass       objectClass = env->FindClass("java/lang/Object");
    jobjectArray result      = env->NewObjectArray(3, objectClass, nullptr);
    env->SetObjectArrayElement(result, 0, vertexArray);
    env->SetObjectArrayElement(result, 1, indexArray);
    env->SetObjectArrayElement(result, 2, uvArray);
    return result;
}


// ════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — MANIFOLD CSG
// ════════════════════════════════════════════════════════════════════════════

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Flat float[]/int[] arrays from JNI → Manifold object.
 */
static Manifold buildManifold(
    JNIEnv* env,
    jfloatArray jVerts,
    jintArray   jInds)
{
    jsize vLen = env->GetArrayLength(jVerts);
    jsize iLen = env->GetArrayLength(jInds);

    jfloat* vData = env->GetFloatArrayElements(jVerts, nullptr);
    jint*   iData = env->GetIntArrayElements  (jInds,  nullptr);

    MeshGL mesh;
    mesh.numProp = 3;                                          // x, y, z only
    mesh.vertProperties.assign(vData, vData + vLen);

    mesh.triVerts.resize(iLen);
    for (jsize k = 0; k < iLen; k++)
        mesh.triVerts[k] = (uint32_t)iData[k];

    env->ReleaseFloatArrayElements(jVerts, vData, JNI_ABORT);
    env->ReleaseIntArrayElements  (jInds,  iData, JNI_ABORT);

    Manifold m(mesh);
    if (m.Status() != Manifold::Error::NoError) {
        LOGE("buildManifold: mesh is not manifold — check for holes/non-watertight geometry");
    }
    return m;
}

/**
 * Manifold → jobjectArray { float[] vertices, int[] indices }.
 */
static jobject manifoldToJava(JNIEnv* env, Manifold& m)
{
    jclass       cls    = env->FindClass("java/lang/Object");
    jobjectArray result = env->NewObjectArray(2, cls, nullptr);

    if (m.Status() != Manifold::Error::NoError) {
        LOGE("manifoldToJava: mesh has errors, status=%d", (int)m.Status());
        return result;
    }

    MeshGL mesh = m.GetMeshGL();

    if (mesh.vertProperties.empty() || mesh.triVerts.empty()) {
        LOGE("manifoldToJava: empty mesh after CSG operation");
        return result;
    }

    LOGI("manifoldToJava: %zu verts %zu tris",
        mesh.vertProperties.size() / 3, mesh.triVerts.size() / 3);

    // vertices
    jfloatArray vOut = env->NewFloatArray((jsize)mesh.vertProperties.size());
    env->SetFloatArrayRegion(vOut, 0,
        (jsize)mesh.vertProperties.size(),
        mesh.vertProperties.data());

    // indices
    jintArray iOut = env->NewIntArray((jsize)mesh.triVerts.size());
    std::vector<jint> iTemp(mesh.triVerts.size());
    for (size_t k = 0; k < mesh.triVerts.size(); k++)
        iTemp[k] = (jint)mesh.triVerts[k];
    env->SetIntArrayRegion(iOut, 0, (jsize)iTemp.size(), iTemp.data());

    env->SetObjectArrayElement(result, 0, vOut);
    env->SetObjectArrayElement(result, 1, iOut);
    return result;
}


// ── 1. subtractMesh: ANY stock geometry + ANY tool geometry ──────────────

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_subtractMesh(
    JNIEnv* env, jobject,
    jfloatArray stockVerts, jintArray stockInds,
    jfloatArray toolVerts,  jintArray toolInds,
    jint op)
{
    if (!stockVerts || !stockInds || !toolVerts || !toolInds) return nullptr;

    LOGI("subtractMesh: building stock...");
    Manifold stock = buildManifold(env, stockVerts, stockInds);

    LOGI("subtractMesh: building tool...");
    Manifold tool  = buildManifold(env, toolVerts,  toolInds);

    Manifold result;
    switch (op) {
        case 0:  result = stock - tool;  LOGI("subtractMesh: op=SUBTRACT"); break;
        case 1:  result = stock + tool;  LOGI("subtractMesh: op=UNION");    break;
        case 2:  result = stock ^ tool;  LOGI("subtractMesh: op=INTERSECT");break;
        default: result = stock - tool;  break;
    }

    LOGI("subtractMesh: done, returning %d verts, %d tris",
        (int)result.NumVert(), (int)result.NumTri());

    return manifoldToJava(env, result);
}


// ── 2. subtractShape: stock from JS + built-in tool primitive ────────────

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_subtractShape(
    JNIEnv* env, jobject,
    jfloatArray stockVerts, jintArray stockInds,
    jint   shapeType,
    jfloat p0, jfloat p1, jfloat p2,
    jfloat tx, jfloat ty, jfloat tz)
{
    if (!stockVerts || !stockInds) return nullptr;

    Manifold stock = buildManifold(env, stockVerts, stockInds);
    Manifold tool;

    switch (shapeType) {
        case 0: {
            int segs = (p2 > 0) ? (int)p2 : 64;
            tool = Manifold::Cylinder(p1, p0, p0, segs);
            LOGI("subtractShape: cylinder r=%.2f h=%.2f segs=%d", p0, p1, segs);
            break;
        }
        case 1: {
            tool = Manifold::Cube({p0, p1, p2}, /*centre=*/true);
            LOGI("subtractShape: box w=%.2f h=%.2f d=%.2f", p0, p1, p2);
            break;
        }
        case 2: {
            int segs = (p1 > 0) ? (int)p1 : 64;
            tool = Manifold::Sphere(p0, segs);
            LOGI("subtractShape: sphere r=%.2f segs=%d", p0, segs);
            break;
        }
        default:
            LOGE("subtractShape: unknown shapeType %d", shapeType);
            return nullptr;
    }

    tool = tool.Translate({tx, ty, tz});

    Manifold result = stock - tool;

    LOGI("subtractShape: done → %d verts %d tris",
        (int)result.NumVert(), (int)result.NumTri());

    return manifoldToJava(env, result);
}


// ── 3. Persistent stock ───────────────────────────────────────────────────

static Manifold gStock;
static bool     gHasStock = false;

extern "C"
JNIEXPORT void JNICALL
Java_com_threeapp_NativeCSG_initStock(
    JNIEnv* env, jobject,
    jfloatArray stockVerts, jintArray stockInds)
{
    LOGI("initStock: uploading stock to C++...");
    gStock    = buildManifold(env, stockVerts, stockInds);
    gHasStock = true;
    LOGI("initStock: done — %d verts %d tris",
        (int)gStock.NumVert(), (int)gStock.NumTri());
}

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyToolMesh(
    JNIEnv* env, jobject,
    jfloatArray toolVerts, jintArray toolInds)
{
    if (!gHasStock) { LOGE("applyToolMesh: no stock — call initStock first"); return nullptr; }

    Manifold tool = buildManifold(env, toolVerts, toolInds);
    gStock = gStock - tool;

    LOGI("applyToolMesh: %d verts %d tris remaining",
        (int)gStock.NumVert(), (int)gStock.NumTri());

    return manifoldToJava(env, gStock);
}

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyShape(
    JNIEnv* env, jobject,
    jint shapeType,
    jfloat p0, jfloat p1, jfloat p2,
    jfloat tx, jfloat ty, jfloat tz)
{
    if (!gHasStock) { LOGE("applyShape: no stock — call initStock first"); return nullptr; }

    Manifold tool;
    switch (shapeType) {
        case 0: { int s=(p2>0)?(int)p2:64; tool=Manifold::Cylinder(p1,p0,p0,s).Translate({tx,ty,tz}); break; }
        case 1: { tool=Manifold::Cube({p0,p1,p2},true).Translate({tx,ty,tz}); break; }
        case 2: { int s=(p1>0)?(int)p1:64; tool=Manifold::Sphere(p0,s).Translate({tx,ty,tz}); break; }
        default: LOGE("applyShape: unknown shapeType %d", shapeType); return nullptr;
    }

    gStock = gStock - tool;

    LOGI("applyShape: %d verts %d tris remaining",
        (int)gStock.NumVert(), (int)gStock.NumTri());

    return manifoldToJava(env, gStock);
}

extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_getStock(JNIEnv* env, jobject)
{
    if (!gHasStock) { LOGE("getStock: no stock set"); return nullptr; }
    return manifoldToJava(env, gStock);
}

extern "C"
JNIEXPORT void JNICALL
Java_com_threeapp_NativeCSG_resetStock(JNIEnv* env, jobject)
{
    gStock    = Manifold();
    gHasStock = false;
    LOGI("resetStock: cleared");
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockCylinder(
    JNIEnv*, jobject,
    jfloat radius,
    jfloat height,
    jint   segments)
{
    LOGI("initStockCylinder: r=%.2f h=%.2f segs=%d", radius, height, (int)segments);

    if (radius <= 0.0f || height <= 0.0f || segments < 3) {
        LOGE("initStockCylinder: invalid params");
        return JNI_FALSE;
    }

    float halfH = height * 0.5f;

    gStock = Manifold::Cylinder(height, radius, radius, (int)segments)
                 .Translate({0.0f, 0.0f, -halfH})
                 .Rotate(-90.0f, 0.0f, 0.0f);

    gHasStock = true;

    auto bb = gStock.BoundingBox();
    LOGI("initStockCylinder: done — %d verts %d tris",
        (int)gStock.NumVert(), (int)gStock.NumTri());
    LOGI("initStockCylinder: bounds X[%.1f..%.1f] Y[%.1f..%.1f] Z[%.1f..%.1f]",
        bb.min.x, bb.max.x, bb.min.y, bb.max.y, bb.min.z, bb.max.z);

    return (gStock.Status() == Manifold::Error::NoError) ? JNI_TRUE : JNI_FALSE;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_threeapp_NativeCSG_initStockFromProfile(
    JNIEnv* env, jobject,
    jfloatArray jProfile,
    jint segments)
{
    LOGI("initStockFromProfile: segments=%d", (int)segments);

    jsize profileLen = env->GetArrayLength(jProfile);
    if (profileLen < 6 || profileLen % 2 != 0) {
        LOGE("initStockFromProfile: bad profile length %d — need >= 3 points (6 floats)", (int)profileLen);
        return JNI_FALSE;
    }
    if (segments < 3) {
        LOGE("initStockFromProfile: segments=%d too small", (int)segments);
        return JNI_FALSE;
    }

    jfloat* data = env->GetFloatArrayElements(jProfile, nullptr);
    if (!data) { LOGE("initStockFromProfile: JNI array access failed"); return JNI_FALSE; }

    int pointCount = profileLen / 2;
    SimplePolygon poly;
    poly.reserve(pointCount);

    for (int i = 0; i < pointCount; i++) {
        double r = (double)data[i * 2 + 0];
        double y = (double)data[i * 2 + 1];
        LOGI("  stock pt[%d] r=%.4f y=%.4f", i, r, y);
        if (r < 0.0) { r = 0.0; }
        poly.push_back({ r, y });
    }
    env->ReleaseFloatArrayElements(jProfile, data, JNI_ABORT);

    if (poly.size() > 1) {
        const double eps = 1e-5;
        if (std::abs(poly.front().x - poly.back().x) < eps &&
            std::abs(poly.front().y - poly.back().y) < eps) {
            poly.pop_back();
            LOGI("initStockFromProfile: stripped duplicate closing vertex");
        }
    }

    if (poly.size() < 3) {
        LOGE("initStockFromProfile: only %zu unique points after dedup — need >= 3", poly.size());
        return JNI_FALSE;
    }

    Polygons crossSection = { poly };
    Manifold newStock;
    try {
        newStock = Manifold::Revolve(crossSection, (int)segments);
    } catch (const std::exception& e) {
        LOGE("initStockFromProfile: Revolve exception: %s", e.what());
        return JNI_FALSE;
    } catch (...) {
        LOGE("initStockFromProfile: Revolve threw unknown exception");
        return JNI_FALSE;
    }

    if (newStock.Status() != Manifold::Error::NoError || newStock.NumVert() == 0) {
        LOGE("initStockFromProfile: Revolve produced invalid mesh (status=%d verts=%d)",
             (int)newStock.Status(), (int)newStock.NumVert());
        return JNI_FALSE;
    }

    gStock    = newStock;
    gHasStock = true;

    auto bb = gStock.BoundingBox();
    LOGI("initStockFromProfile: done — %d verts %d tris",
         (int)gStock.NumVert(), (int)gStock.NumTri());
    LOGI("initStockFromProfile: bounds X[%.2f..%.2f] Y[%.2f..%.2f] Z[%.2f..%.2f]",
         bb.min.x, bb.max.x, bb.min.y, bb.max.y, bb.min.z, bb.max.z);

    return JNI_TRUE;
}

/**
 * applyLatheProfile — WITH FULL TRANSFORM SUPPORT
 *
 * Profile format: [r0,y0, r1,y1, ...]
 * Transform order: Revolve → Rotate(rx,ry,rz) → Translate(tx,ty,tz)
 *
 * All transforms are optional (pass 0 to skip).
 * Rotation angles in DEGREES.
 */
extern "C"
JNIEXPORT jobject JNICALL
Java_com_threeapp_NativeCSG_applyLatheProfile(
    JNIEnv* env, jobject,
    jfloatArray jProfile,
    jint   segments,
    jfloat tx, jfloat ty, jfloat tz,
    jfloat rx, jfloat ry, jfloat rz)
{
    auto errorResult = [&]() -> jobject {
        jclass cls = env->FindClass("java/lang/Object");
        return env->NewObjectArray(2, cls, nullptr);
    };

    if (!gHasStock) {
        LOGE("applyLatheProfile: no stock — call initStock first");
        return errorResult();
    }

    jsize profileLen = env->GetArrayLength(jProfile);
    LOGI("applyLatheProfile: profileLen=%d segments=%d", (int)profileLen, (int)segments);
    LOGI("applyLatheProfile: transform tx=%.3f ty=%.3f tz=%.3f rx=%.3f ry=%.3f rz=%.3f",
         tx, ty, tz, rx, ry, rz);

    if (profileLen < 4 || profileLen % 2 != 0) {
        LOGE("applyLatheProfile: bad profile length %d — need at least 4 floats (2 points)", (int)profileLen);
        return errorResult();
    }

    if (segments < 3) {
        LOGE("applyLatheProfile: segments=%d too small, minimum is 3", (int)segments);
        return errorResult();
    }

    jfloat* profileData = env->GetFloatArrayElements(jProfile, nullptr);
    if (!profileData) {
        LOGE("applyLatheProfile: failed to get profile data from JNI");
        return errorResult();
    }

    int pointCount = profileLen / 2;
    LOGI("applyLatheProfile: %d raw points", pointCount);

    SimplePolygon poly;
    poly.reserve(pointCount);

    for (int i = 0; i < pointCount; i++) {
        double r = (double)profileData[i * 2 + 0];
        double z = (double)profileData[i * 2 + 1];
        LOGI("  pt[%d] r=%.4f z=%.4f", i, r, z);

        if (r < 0.0) {
            LOGE("applyLatheProfile: pt[%d] has negative radius r=%.4f — clamping to 0", i, r);
            r = 0.0;
        }

        poly.push_back({ r, z });
    }

    env->ReleaseFloatArrayElements(jProfile, profileData, JNI_ABORT);

    if (poly.size() > 1) {
        const auto& first = poly.front();
        const auto& last  = poly.back();
        const double eps  = 1e-5;
        if (std::abs(first.x - last.x) < eps &&
            std::abs(first.y - last.y) < eps) {
            poly.pop_back();
            LOGI("applyLatheProfile: stripped duplicate closing vertex (first==last)");
        }
    }

    if (poly.size() < 3) {
        LOGE("applyLatheProfile: polygon has only %zu unique points after dedup — need >= 3",
             poly.size());
        return errorResult();
    }

    LOGI("applyLatheProfile: %zu unique points after dedup", poly.size());

    Polygons crossSection = { poly };
    LOGI("applyLatheProfile: calling Manifold::Revolve with %d segments...", (int)segments);

    Manifold tool;
    try {
        tool = Manifold::Revolve(crossSection, (int)segments);
    } catch (const std::exception& e) {
        LOGE("applyLatheProfile: Revolve exception: %s", e.what());
        return errorResult();
    } catch (...) {
        LOGE("applyLatheProfile: Revolve threw unknown exception");
        return errorResult();
    }

    LOGI("applyLatheProfile: tool created — status=%d verts=%d tris=%d",
        (int)tool.Status(), (int)tool.NumVert(), (int)tool.NumTri());

    if (tool.Status() != Manifold::Error::NoError) {
        LOGE("applyLatheProfile: Revolve produced invalid mesh (status=%d)", (int)tool.Status());
        return errorResult();
    }

    if (tool.NumVert() == 0 || tool.NumTri() == 0) {
        LOGE("applyLatheProfile: Revolve produced empty mesh");
        return errorResult();
    }

    // ── Apply transforms ─────────────────────────────────────────────────
    // Order: Rotate → Translate (THREE.js convention)

    const float EPS = 1e-6f;
    
    // Check if rotation is non-trivial
    if (std::fabs(rx) > EPS || std::fabs(ry) > EPS || std::fabs(rz) > EPS) {
        LOGI("applyLatheProfile: applying rotation (%.2f, %.2f, %.2f) deg", rx, ry, rz);
        tool = tool.Rotate(rx, ry, rz);
        auto toolBox = tool.BoundingBox();
        LOGI("applyLatheProfile: after rotation bounds X[%.2f..%.2f] Y[%.2f..%.2f] Z[%.2f..%.2f]",
            toolBox.min.x, toolBox.max.x, toolBox.min.y, toolBox.max.y, toolBox.min.z, toolBox.max.z);
    }

    // Check if translation is non-trivial
    if (std::fabs(tx) > EPS || std::fabs(ty) > EPS || std::fabs(tz) > EPS) {
        LOGI("applyLatheProfile: applying translation (%.2f, %.2f, %.2f)", tx, ty, tz);
        tool = tool.Translate({tx, ty, tz});
        auto toolBox = tool.BoundingBox();
        LOGI("applyLatheProfile: after translation bounds X[%.2f..%.2f] Y[%.2f..%.2f] Z[%.2f..%.2f]",
            toolBox.min.x, toolBox.max.x, toolBox.min.y, toolBox.max.y, toolBox.min.z, toolBox.max.z);
    }

    // Log final tool bounds
    auto toolBox = tool.BoundingBox();
    LOGI("applyLatheProfile: final tool bounds X[%.2f..%.2f] Y[%.2f..%.2f] Z[%.2f..%.2f]",
        toolBox.min.x, toolBox.max.x, toolBox.min.y, toolBox.max.y, toolBox.min.z, toolBox.max.z);

    // Log stock bounds for comparison
    auto stockBox = gStock.BoundingBox();
    LOGI("applyLatheProfile: stock bounds X[%.2f..%.2f] Y[%.2f..%.2f] Z[%.2f..%.2f]",
        stockBox.min.x, stockBox.max.x, stockBox.min.y, stockBox.max.y, stockBox.min.z, stockBox.max.z);

    LOGI("applyLatheProfile: subtracting tool (%d verts, %d tris) from stock...",
        (int)tool.NumVert(), (int)tool.NumTri());

    try {
        gStock = gStock - tool;
    } catch (const std::exception& e) {
        LOGE("applyLatheProfile: subtract exception: %s", e.what());
        return errorResult();
    } catch (...) {
        LOGE("applyLatheProfile: subtract threw unknown exception");
        return errorResult();
    }

    if (gStock.Status() != Manifold::Error::NoError) {
        LOGE("applyLatheProfile: stock is invalid after subtraction (status=%d)",
             (int)gStock.Status());
        return errorResult();
    }

    LOGI("applyLatheProfile: SUCCESS — stock now %d verts %d tris",
        (int)gStock.NumVert(), (int)gStock.NumTri());

    return manifoldToJava(env, gStock);
}