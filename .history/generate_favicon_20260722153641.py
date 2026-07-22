from PIL import Image, ImageDraw

# Generate a simple black-circle favicon with multiple sizes
sizes = [64, 48, 32, 16]
# Create base image (largest size)
base_size = max(sizes)
img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
# Draw a black circle with padding
pad = int(base_size * 0.12)
draw.ellipse((pad, pad, base_size - pad - 1, base_size - pad - 1), fill=(0, 0, 0, 255))
# Save as favicon.ico containing multiple sizes
img.save('favicon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('favicon.ico generated')
