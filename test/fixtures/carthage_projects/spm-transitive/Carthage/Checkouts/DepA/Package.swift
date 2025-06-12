import PackageDescription

let package = Package(
    name: "YourLibrary",
    products: [
        .library(
            name: "YourLibrary",
            targets: ["YourLibrary"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "YourLibrary",
            dependencies: []),
        .testTarget(
            name: "YourLibraryTests",
            dependencies: ["YourLibrary"]),
    ]
)
