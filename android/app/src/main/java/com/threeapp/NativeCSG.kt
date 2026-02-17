package com.threeapp

import com.facebook.react.bridge.*

class NativeCSG(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    init { System.loadLibrary("native-lib") }

    override fun getName(): String = "NativeCSG"

    // ── JNI declarations ─────────────────────────────────────────────────

    external fun subtractMesh(
        stockVerts: FloatArray, stockInds: IntArray,
        toolVerts:  FloatArray, toolInds:  IntArray,
        op: Int
    ): Array<Any>

    external fun subtractShape(
        stockVerts: FloatArray, stockInds: IntArray,
        shapeType: Int,
        p0: Float, p1: Float, p2: Float,
        tx: Float, ty: Float, tz: Float
    ): Array<Any>

    external fun initStock(stockVerts: FloatArray, stockInds: IntArray)
    external fun initStockCylinder(radius: Float, height: Float, segments: Int): Boolean
    external fun initStockFromProfile(profile: FloatArray, segments: Int): Boolean
    external fun applyToolMesh(toolVerts: FloatArray, toolInds: IntArray): Array<Any>
    external fun applyShape(shapeType: Int, p0: Float, p1: Float, p2: Float, tx: Float, ty: Float, tz: Float): Array<Any>
    external fun getStock(): Array<Any>
    external fun resetStock()

    /**
     * Revolve a 2D profile and subtract from stock.
     *
     * profile:  flat [r0,y0, r1,y1, ...] — Manifold XY coords, CCW = solid cut
     * segments: revolution quality (64 recommended)
     * tx,ty,tz: translation in world units (applied AFTER rotation)
     * rx,ry,rz: rotation in DEGREES around X, Y, Z axes
     *
     * Pass 0 for any transform param to skip that operation.
     * Transform order: Revolve → Rotate(rx,ry,rz) → Translate(tx,ty,tz)
     */
    external fun applyLatheProfile(
        profile: FloatArray,
        segments: Int,
        tx: Float, ty: Float, tz: Float,
        rx: Float, ry: Float, rz: Float
    ): Array<Any>

    // ── Helpers ───────────────────────────────────────────────────────────

    private fun ReadableArray.toFloatArray(): FloatArray = FloatArray(size()) { getDouble(it).toFloat() }
    private fun ReadableArray.toIntArray():   IntArray   = IntArray(size())   { getDouble(it).toInt()   }

    private fun packResult(raw: Array<Any>): WritableMap {
        val map     = Arguments.createMap()
        val verts   = raw.getOrNull(0) as? FloatArray
        val indices = raw.getOrNull(1) as? IntArray
        if (verts == null || indices == null) {
            map.putBoolean("success", false)
            map.putString("error", "C++ returned null mesh — check logcat NativeLib tag")
            return map
        }
        map.putBoolean("success", true)
        map.putArray("vertices", Arguments.createArray().also { a -> verts.forEach   { a.pushDouble(it.toDouble()) } })
        map.putArray("indices",  Arguments.createArray().also { a -> indices.forEach { a.pushInt(it) } })
        return map
    }

    // ── React Methods ─────────────────────────────────────────────────────

    @ReactMethod
    fun subtractMesh(
        sv: ReadableArray, si: ReadableArray,
        tv: ReadableArray, ti: ReadableArray,
        op: Int, promise: Promise
    ) {
        try { promise.resolve(packResult(subtractMesh(sv.toFloatArray(),si.toIntArray(),tv.toFloatArray(),ti.toIntArray(),op))) }
        catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun subtractShape(
        sv: ReadableArray, si: ReadableArray,
        shapeType:Int, p0:Double,p1:Double,p2:Double,tx:Double,ty:Double,tz:Double, promise:Promise
    ) {
        try { promise.resolve(packResult(subtractShape(sv.toFloatArray(),si.toIntArray(),shapeType,p0.toFloat(),p1.toFloat(),p2.toFloat(),tx.toFloat(),ty.toFloat(),tz.toFloat()))) }
        catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun initStock(sv: ReadableArray, si: ReadableArray, promise: Promise) {
        try { initStock(sv.toFloatArray(), si.toIntArray()); promise.resolve(true) }
        catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun initStockCylinder(radius: Double, height: Double, segments: Int, promise: Promise) {
        try {
            if (initStockCylinder(radius.toFloat(), height.toFloat(), segments))
                promise.resolve(true)
            else
                promise.reject("CSG_ERROR", "initStockCylinder failed")
        } catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun initStockFromProfile(profile: ReadableArray, segments: Int, promise: Promise) {
        try {
            if (initStockFromProfile(profile.toFloatArray(), segments))
                promise.resolve(true)
            else
                promise.reject("CSG_ERROR", "initStockFromProfile failed — check logcat NativeLib")
        } catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun applyToolMesh(tv: ReadableArray, ti: ReadableArray, promise: Promise) {
        try { promise.resolve(packResult(applyToolMesh(tv.toFloatArray(), ti.toIntArray()))) }
        catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod
    fun applyShape(shapeType:Int,p0:Double,p1:Double,p2:Double,tx:Double,ty:Double,tz:Double,promise:Promise) {
        try { promise.resolve(packResult(applyShape(shapeType,p0.toFloat(),p1.toFloat(),p2.toFloat(),tx.toFloat(),ty.toFloat(),tz.toFloat()))) }
        catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod fun getStock(promise: Promise) {
        try { promise.resolve(packResult(getStock())) } catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    @ReactMethod fun resetStock(promise: Promise) {
        try { resetStock(); promise.resolve(true) } catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }

    /**
     * Revolve a 2D profile and subtract from persistent stock.
     *
     * profile:  flat [r0,y0, r1,y1, ...] — Manifold XY coords
     * segments: revolution quality
     * tx,ty,tz: position offset in world units  (default 0,0,0)
     * rx,ry,rz: rotation in degrees             (default 0,0,0)
     */
    @ReactMethod
    fun applyLatheProfile(
        profile:  ReadableArray,
        segments: Int,
        tx: Double, ty: Double, tz: Double,
        rx: Double, ry: Double, rz: Double,
        promise:  Promise
    ) {
        try {
            promise.resolve(packResult(applyLatheProfile(
                profile.toFloatArray(), segments,
                tx.toFloat(), ty.toFloat(), tz.toFloat(),
                rx.toFloat(), ry.toFloat(), rz.toFloat()
            )))
        } catch(e:Exception){ promise.reject("CSG_ERROR",e) }
    }
}