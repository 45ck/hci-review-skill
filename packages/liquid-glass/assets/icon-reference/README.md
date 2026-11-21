# Icon art direction

`quantive-glass-generated.png` is the original transparent 12-icon sheet generated for this project using `image_gen.imagegen` on 21 November 2026. `generation-prompt.txt` preserves the complete prompt.

The image was inspected before conversion. Production icons retain the rounded silhouettes, blue/teal faces, light rims, depth and selective peach details, while simplifying them for small interface sizes. Their SVGs contain geometry and gradients only. The original raster's fine alpha-edge artifacts are not included in production artwork.

`build-icons.py` records the deliberate vector redraw and regenerates `../../src/icons.tsx`, the individual SVGs under `../icons/`, and `vector-review.svg`. Run it with Python 3 from any working directory. It uses no external libraries and no network. `vector-review.svg` is a review artifact, not a new application screen.

The PNG is provenance and visual reference only; the application does not load it. These are original project illustrations inspired by the requested material direction. They do not include Apple's or 21st.dev's icon files.
