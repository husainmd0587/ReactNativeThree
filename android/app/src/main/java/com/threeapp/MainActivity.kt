package com.threeapp

import android.os.Build
import android.util.Log
import android.window.OnBackInvokedDispatcher

import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "threeapp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            )
        )


}