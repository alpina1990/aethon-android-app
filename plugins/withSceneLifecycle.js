// Adopts the UIScene life cycle on iOS.
//
// Apps built with the iOS 27 SDK stop at launch unless they use scenes. Expo
// SDK 57 ships the scene delegate for this (ExpoAppSceneDelegate, Objective-C
// name EXExpoAppSceneDelegate): it creates the window, starts React Native in
// it and forwards links, including links that cold-start the app. The SDK 57
// app template does not use it yet, so this plugin wires it up on every
// prebuild instead of editing the generated ios/ folder by hand.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE = 'EXExpoAppSceneDelegate';

function withSceneManifest(config) {
  return withInfoPlist(config, cfg => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE,
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, cfg => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;

    // The scene delegate finds the React Native factory through this protocol.
    const declaration = 'class AppDelegate: ExpoAppDelegate {';
    // Under scenes the scene delegate creates the window, not the app delegate.
    const windowSetup =
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

    if (!src.includes(declaration) || !windowSetup.test(src)) {
      // The Expo template changed: fail loudly rather than build an app that
      // stops at launch.
      throw new Error('withSceneLifecycle: AppDelegate.swift no longer matches the expected template');
    }
    src = src.replace(declaration, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    src = src.replace(
      windowSetup,
      '    // The window is created by the scene delegate (EXExpoAppSceneDelegate).\n',
    );
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = config => withSceneAppDelegate(withSceneManifest(config));
