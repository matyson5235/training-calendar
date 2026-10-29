// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "SachoveTreninky",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(
            name: "SachoveTreninky",
            targets: ["SachoveTreninky"]
        ),
    ],
    targets: [
        .target(
            name: "SachoveTreninky"
        ),
    ]
)
