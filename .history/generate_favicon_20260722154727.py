from PIL import Image, ImageDraw, ImageFont

# Generate a black square favicon with a white infinity symbol
sizes = [64, 48, 32, 16]
# Create base image (largest size)
base_size = max(sizes)
img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 255))
draw = ImageDraw.Draw(img)

# Choose a font; fall back to default if we cannot load a system font.
font_size = int(base_size * 0.9)
font = None
for font_name in ["arial.ttf", "seguisym.ttf", "Segoe UI Symbol.ttf", "Symbola.ttf"]:
    try:
        font = ImageFont.truetype(font_name, font_size)
        break
    except OSError:
        continue
if font is None:
    font = ImageFont.load_default()

text = "∞"
text_bbox = draw.textbbox((0, 0), text, font=font)
text_width = text_bbox[2] - text_bbox[0]
text_height = text_bbox[3] - text_bbox[1]
text_x = (base_size - text_width) // 2
text_y = (base_size - text_height) // 2

draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)

# Save as favicon.ico containing multiple sizes
img.save('favicon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('favicon.ico generated')
