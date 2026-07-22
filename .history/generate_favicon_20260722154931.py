from PIL import Image, ImageDraw
import math

# Generate a black square favicon with a centered, symmetric white infinity symbol
sizes = [64, 48, 32, 16]
# Create base image (largest size)
base_size = max(sizes)
img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 255))
draw = ImageDraw.Draw(img)

# Infinity curve parameters
padding = base_size * 0.14
curve_width = base_size - padding * 2
curve_height = curve_width * 0.58
stroke_width = max(6, int(base_size * 0.16))
center = base_size / 2

# Create symmetric infinity path using a lemniscate of Bernoulli
points = []
steps = 160
for i in range(steps + 1):
    t = math.pi * 2 * i / steps
    x = math.sqrt(2) * math.cos(t) / (math.sin(t) ** 2 + 1)
    y = math.sqrt(2) * math.cos(t) * math.sin(t) / (math.sin(t) ** 2 + 1)
    x = center + x * curve_width * 0.5
    y = center + y * curve_height * 0.5
    points.append((x, y))

# Draw the infinity path with a white stroke
for start in range(0, len(points) - 1):
    draw.line([points[start], points[start + 1]], fill=(255, 255, 255, 255), width=stroke_width)

# Save as favicon.ico containing multiple sizes
img.save('favicon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('favicon.ico generated')
