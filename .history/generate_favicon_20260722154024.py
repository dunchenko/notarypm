from PIL import Image, ImageDraw

# Generate a black square favicon with a white infinity symbol
sizes = [64, 48, 32, 16]
# Create base image (largest size)
base_size = max(sizes)
img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 255))
draw = ImageDraw.Draw(img)

# Infinity symbol parameters
stroke_width = int(base_size * 0.14)
center = base_size // 2
width = int(base_size * 0.72)
height = int(base_size * 0.38)

# Left and right loops
left_bounds = [center - width // 2, center - height // 2, center, center + height // 2]
right_bounds = [center, center - height // 2, center + width // 2, center + height // 2]

# Draw two arcs for the infinity symbol
for bounds in (left_bounds, right_bounds):
    draw.arc(bounds, start=60, end=300, fill=(255, 255, 255, 255), width=stroke_width)

# Add a center connector by drawing a thin rectangle and circles for smoother join
connector_width = stroke_width
connector_height = int(stroke_width * 0.9)
connector_box = [center - connector_width // 2, center - connector_height // 2, center + connector_width // 2, center + connector_height // 2]
draw.rectangle(connector_box, fill=(255, 255, 255, 255))

# Save as favicon.ico containing multiple sizes
img.save('favicon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('favicon.ico generated')
