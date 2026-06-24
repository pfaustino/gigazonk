# Assets

Document third-party assets used in GigaZonk. Update when adding images, music, or models.

## Music

Pixabay tracks in `public/music/` — see `public/music/manifest.json`. Verify license on Pixabay at time of use.

## Images

| File | Source | License |
|------|--------|---------|
| `public/images/mouths.png` | Project art (7×5 mouth sprite sheet, RGBA) | — |

Export from your art tool as **PNG with transparency** when possible; the repo can fall back to checkerboard keying if the file is RGB-only.
| `public/images/title-hero.png` | Project art | — |
| `public/images/pixabay-*.jpg` | Pixabay | Check per file |
| Terrain textures | Pixabay | Check per file |

## 3D

Procedural geometry + instanced meshes for enemies. GLB imports: document here when added.

## Optimization

- Compress GLBs with [gltf-transform](https://github.com/donmccurdy/glTF-Transform) before shipping large models.
- Keep music files reasonable; prefer manifest-driven loading.
