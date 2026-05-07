const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// expo 54 generates MainApplication.kt using the RN 0.81.5 template
// (ReactNativeApplicationEntryPoint) even when the project uses RN 0.79.5,
// which doesn't have that API. This plugin replaces the generated file with
// the correct RN 0.79.5 initialization code.
const MAIN_APPLICATION_KT = (pkg) => `package ${pkg}

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

module.exports = function withFixMainApplication(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const pkg = cfg.android?.package ?? 'com.facebook.react';
      const pkgPath = pkg.replace(/\./g, '/');
      const filePath = path.join(
        cfg.modRequest.platformProjectRoot,
        `app/src/main/java/${pkgPath}/MainApplication.kt`
      );

      if (
        fs.existsSync(filePath) &&
        fs.readFileSync(filePath, 'utf8').includes('ReactNativeApplicationEntryPoint')
      ) {
        fs.writeFileSync(filePath, MAIN_APPLICATION_KT(pkg), 'utf8');
      }

      return cfg;
    },
  ]);
};
