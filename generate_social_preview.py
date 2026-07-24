from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

base = Path(r'd:\Desktop\SORT\NotaryPM')
font_path = r'C:\Windows\Fonts\arial.ttf'


def fit_font(draw, text, max_width, max_height, start_size):
    size = start_size
    while size >= 10:
        font = ImageFont.truetype(font_path, size)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if text_w <= max_width and text_h <= max_height:
            return font
        size -= 4
    return ImageFont.truetype(font_path, 10)


for width, height, name in [
    (1200, 630, 'social-preview.png'),
    (1080, 1080, 'social-preview-square.png'),
]:
    img = Image.new('RGB', (width, height), '#000000')
    draw = ImageDraw.Draw(img)

    padding = 72
    safe_size = min(width, height) - (padding * 2)
    safe_left = (width - safe_size) // 2
    safe_top = (height - safe_size) // 2
    safe_right = safe_left + safe_size
    safe_bottom = safe_top + safe_size

    title = 'NOTARY SERVICE'
    title_font = fit_font(draw, title, safe_size * 0.92, safe_size * 0.42, 140)
    title_box = draw.textbbox((0, 0), title, font=title_font)
    title_w = title_box[2] - title_box[0]
    title_h = title_box[3] - title_box[1]
    title_x = (width - title_w) // 2
    title_y = (safe_top + safe_bottom - title_h) // 2 - 26
    draw.text((title_x, title_y), title, fill='white', font=title_font)

    sub = '.CA'
    sub_font = fit_font(draw, sub, safe_size * 0.25, safe_size * 0.22, 110)
    sub_box = draw.textbbox((0, 0), sub, font=sub_font)
    sub_w = sub_box[2] - sub_box[0]
    sub_h = sub_box[3] - sub_box[1]
    sub_x = (width - sub_w) // 2
    sub_y = title_y + title_h + 24

    if sub_x < safe_left:
        sub_x = safe_left
    if sub_y + sub_h > safe_bottom:
        sub_y = safe_bottom - sub_h

    draw.text((sub_x, sub_y), sub, fill='white', font=sub_font)

    img.save(base / name, format='PNG')
    print(f'Generated {base / name}')
