import type { ImageMetadata } from "astro";

export async function resolveImage(path: string): Promise<ImageMetadata | string> {
    const images = import.meta.glob<{ default: ImageMetadata }>(
        "/src/assets/images/**/*.{jpeg,jpg,png,gif,svg,webp}"
    );

    const assetPath = path.startsWith("/images/")
        ? path.replace("/images/", "/src/assets/images/")
        : path.startsWith("/")
            ? `/src/assets${path}`
            : `/src/assets/images/${path}`;

    if (images[assetPath]) {
        const mod = await images[assetPath]();
        return mod.default;
    }

    // Fallback for paths that might not have leading slash or other variations
    const alternativePath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
    if (images[alternativePath]) {
        const mod = await images[alternativePath]();
        return mod.default;
    }

    // If not found in assets, return original path as string (remote or public fallback)
    return path;
}

export async function resolveImageUrl(path: string): Promise<string> {
    const resolved = await resolveImage(path);
    return typeof resolved === "string" ? resolved : resolved.src;
}
