const builder = require("electron-builder");
const Platform = builder.Platform;

builder.build({
    targets: Platform.WINDOWS.createTarget("nsis", builder.archFromString("x64")),
    config: {
        appId: "com.baki.muhasebe",
        productName: "Kisisel Muhasebe",
        files: [
            "build/**/*",
            "node_modules/**/*",
            "public/**/*",
            "package.json"
        ],
        directories: {
            buildResources: "public",
            output: "dist"
        },
        extraMetadata: {
            main: "build/electron.js"
        }
    }
}).then((result) => {
    console.log("Build OK:", result);
}).catch((error) => {
    console.error("Build Failed:", error);
});
