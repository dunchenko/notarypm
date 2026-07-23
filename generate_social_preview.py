from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

base = Path(r'd:\Desktop\SORT\NotaryPM')
font_path = r'C:\Windows\Fonts\arial.ttf'
main_font = ImageFont.truetype(font_path, 140)
sub_font = ImageFont.truetype(font_path, 28)

for width, height, name in [
    (1200, 630, 'social-preview.png'),
    (1080, 1080, 'social-preview-square.png'),
]:
    img = Image.new('RGB', (width, height), '#000000')
    draw = ImageDraw.Draw(img)

    title = 'NOTS.CA'
    bbox = draw.textbbox((0, 0), title, font=main_font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (width - text_w) // 2
    y = (height - text_h) // 2 - 30
    draw.text((x, y), title, fill='white', font=main_font)

    sub = 'NOTARY SERVICES'
    bbox2 = draw.textbbox((0, 0), sub, font=sub_font)
    text_w2 = bbox2[2] - bbox2[0]
    text_h2 = bbox2[3] - bbox2[1]
    draw.text(((width - text_w2) // 2, y + text_h + 40), sub, fill='white', font=sub_font)

    img.save(base / name, format='PNG')
    print(f'Generated {base / name}')
