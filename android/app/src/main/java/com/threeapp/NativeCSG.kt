package com.threeapp

import com.facebook.react.bridge.*

class NativeCSG(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    init { System.loadLibrary("native-lib") }

    override fun getName(): String = "NativeCSG"

    // ─────────────────────────────────────────────────────────────────────
    // JNI DECLARATIONS
    // ─────────────────────────────────────────────────────────────────────

    external fun initStock(stockVerts: FloatArray, stockInds: IntArray): Boolean
    external fun initStockBox(w: Float, h: Float, d: Float): Boolean
    external fun initStockCylinder(radius: Float, height: Float, segments: Int): Boolean
    external fun initStockFromProfile(profile: FloatArray, segments: Int): Boolean

    external fun applyLatheProfile(
        profile: FloatArray, segments: Int,
        tx: Float, ty: Float, tz: Float,
        rx: Float, ry: Float, rz: Float
    ): Array<Any>

    // op: 0=subtract  1=union  2=intersect
    // hasMaterial: 1=this cut has a material, 0=no material
    external fun applyMeshToolWithTransform(
        toolVerts: FloatArray, toolInds: IntArray,
        tx: Float, ty: Float, tz: Float,
        rx: Float, ry: Float, rz: Float,
        sx: Float, sy: Float, sz: Float,
        op: Int,
        hasMaterial: Int       // ← new
    ): Array<Any>

    external fun getStock(): Array<Any>
    external fun resetStock()

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────

    private fun ReadableArray.toFloatArray(): FloatArray =
        FloatArray(size()) { getDouble(it).toFloat() }

    private fun ReadableArray.toIntArray(): IntArray =
        IntArray(size()) { getDouble(it).toInt() }

    // Packs Array<Any>{float[], int[], int[] faceIDs} → WritableMap
    private fun packResultWithFaces(raw: Array<Any>): WritableMap {
        val map   = Arguments.createMap()
        val verts   = raw[0] as? FloatArray
        val inds    = raw[1] as? IntArray
        val faceIDs = raw.getOrNull(2) as? IntArray
        val toolIDs = raw.getOrNull(3) as? IntArray  // single-element: the assigned toolID

        if (verts == null || inds == null || verts.isEmpty() || inds.isEmpty()) {
            map.putBoolean("success", false)
            return map
        }

        val vArr = Arguments.createArray().also { a -> verts.forEach   { a.pushDouble(it.toDouble()) } }
        val iArr = Arguments.createArray().also { a -> inds.forEach    { a.pushInt(it) } }

        map.putBoolean("success",  true)
        map.putArray("vertices",   vArr)
        map.putArray("indices",    iArr)

        if (faceIDs != null && faceIDs.isNotEmpty()) {
            val fArr = Arguments.createArray().also { a -> faceIDs.forEach { a.pushInt(it) } }
            map.putArray("faceIDs", fArr)
        }

        if (toolIDs != null && toolIDs.isNotEmpty()) {
            map.putInt("toolID", toolIDs[0])
        }

        return map
    }

    // ─────────────────────────────────────────────────────────────────────
    // React Methods
    // ─────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun initStock(sv: ReadableArray, si: ReadableArray, promise: Promise) {
        try {
            val ok = initStock(sv.toFloatArray(), si.toIntArray())
            if (ok) promise.resolve(true) else promise.reject("CSG_ERROR", "initStock failed")
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun initStockBox(w: Double, h: Double, d: Double, promise: Promise) {
        try {
            val ok = initStockBox(w.toFloat(), h.toFloat(), d.toFloat())
            if (ok) promise.resolve(true) else promise.reject("CSG_ERROR", "initStockBox failed")
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun initStockCylinder(radius: Double, height: Double, segments: Int, promise: Promise) {
        try {
            val ok = initStockCylinder(radius.toFloat(), height.toFloat(), segments)
            if (ok) promise.resolve(true) else promise.reject("CSG_ERROR", "initStockCylinder failed")
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun initStockFromProfile(profile: ReadableArray, segments: Int, promise: Promise) {
        try {
            val ok = initStockFromProfile(profile.toFloatArray(), segments)
            if (ok) promise.resolve(true) else promise.reject("CSG_ERROR", "initStockFromProfile failed")
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun applyLatheProfile(
        profile: ReadableArray, segments: Int,
        tx: Double, ty: Double, tz: Double,
        rx: Double, ry: Double, rz: Double,
        promise: Promise
    ) {
        try {
            promise.resolve(packResultWithFaces(applyLatheProfile(
                profile.toFloatArray(), segments,
                tx.toFloat(), ty.toFloat(), tz.toFloat(),
                rx.toFloat(), ry.toFloat(), rz.toFloat()
            )))
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun applyMeshToolWithTransform(
        toolVerts: ReadableArray, toolInds: ReadableArray,
        tx: Double, ty: Double, tz: Double,
        rx: Double, ry: Double, rz: Double,
        sx: Double, sy: Double, sz: Double,
        op: Int,
        hasMaterial: Int,      // ← new
        promise: Promise
    ) {
        try {
            promise.resolve(packResultWithFaces(applyMeshToolWithTransform(
                toolVerts.toFloatArray(), toolInds.toIntArray(),
                tx.toFloat(), ty.toFloat(), tz.toFloat(),
                rx.toFloat(), ry.toFloat(), rz.toFloat(),
                sx.toFloat(), sy.toFloat(), sz.toFloat(),
                op,
                hasMaterial
            )))
        } catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun getStock(promise: Promise) {
        try { promise.resolve(packResultWithFaces(getStock())) }
        catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }

    @ReactMethod
    fun resetStock(promise: Promise) {
        try { resetStock(); promise.resolve(true) }
        catch (e: Exception) { promise.reject("CSG_ERROR", e) }
    }
}