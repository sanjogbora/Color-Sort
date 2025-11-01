# Color Analysis Modes

## Overview
HueSort now offers two color analysis modes to handle different types of images.

## Math Mode (Original)
**Best for**: General purpose, colorful images

### How it works:
- Simple histogram analysis in LCH color space
- Counts pixels by hue ranges (20° bins)
- Finds the most common hue
- Fast and deterministic

### Strengths:
- ✅ Very fast processing
- ✅ Works well for vibrant, colorful images
- ✅ Simple and predictable

### Weaknesses:
- ❌ Can be fooled by grey backgrounds with subtle color tints
- ❌ Treats all pixels equally (no weighting)
- ❌ May pick background color over accent colors

## Visual Mode (New - Recommended)
**Best for**: Images with grey backgrounds, text, logos, mixed content

### How it works:
1. **Neutral Detection**: Filters out grey/white/black pixels (chroma < 15)
2. **Smart Weighting**: Each pixel gets a weight based on:
   - **Chroma²**: Vibrant colors matter exponentially more
   - **Center position**: Center pixels weighted higher (Gaussian falloff)
   - **Lightness**: Mid-tones preferred over extremes
3. **Weighted Histogram**: Builds 20° hue bins using weighted pixels
4. **Bin Smoothing**: Gaussian blur reduces boundary jitter
5. **Centroid Calculation**: Finds average color in a*b* space (more accurate)
6. **Pop Color Override**: Strong accent colors override neutral classification

### Strengths:
- ✅ Correctly identifies text/logo colors on grey backgrounds
- ✅ Ignores subtle color tints in neutrals
- ✅ Perceptually accurate (matches human perception)
- ✅ Handles edge cases (grey + yellow text → Yellow)
- ✅ Classifies truly neutral images separately

### Weaknesses:
- ⚠️ Slightly slower (still fast, ~50ms per image)
- ⚠️ More complex algorithm

## Key Differences

| Feature | Math Mode | Visual Mode |
|---------|-----------|-------------|
| Speed | Very Fast | Fast |
| Accuracy | Good | Excellent |
| Grey handling | Poor | Excellent |
| Text detection | No | Yes (via weighting) |
| Neutral classification | No | Yes |
| Weighting | Equal | Smart (chroma², center, lightness) |

## When to Use Each Mode

### Use Math Mode when:
- Images are mostly colorful (no grey backgrounds)
- Speed is critical
- Images have clear, dominant colors
- Simple sorting is sufficient

### Use Visual Mode when:
- Images have grey/white/black backgrounds
- Text or logos are the main color elements
- Images are design assets, screenshots, or graphics
- You need perceptually accurate sorting
- You want neutral images grouped separately

## Technical Details

### Visual Mode Parameters:
- **Neutral chroma range**: 7-15 (soft ramp)
- **Neutral coverage threshold**: 80%
- **Pop color weight threshold**: 12%
- **Pop color chroma threshold**: 28
- **Hue bins**: 18 bins of 20° each
- **Bin smoothing**: 3-tap Gaussian [0.25, 0.5, 0.25]
- **Center weight**: Gaussian with σ = 0.5
- **Lightness weight**: 0.7 to 1.0 (peak at L=0.5)

### Example Results:

**Image: Grey background + yellow text**
- Math Mode: Detects green (from grey tint) ❌
- Visual Mode: Detects yellow (from text) ✅

**Image: White fashion photo with mint garment**
- Math Mode: Detects white/grey ❌
- Visual Mode: Detects mint ✅

**Image: Colorful poster**
- Math Mode: Detects dominant color ✅
- Visual Mode: Detects dominant color ✅

## Default Setting
Visual Mode is set as default because it handles more edge cases while still working well for simple images.
