from pathlib import Path
from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).resolve().parents[1]
ASSETS_DIR = BASE_DIR / "assets"
DEFAULT_SIZE = (16, 16)


def hex_to_rgba(hex_color):
    if hex_color is None:
        return None
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        raise ValueError(f"Expected 6-digit hex value, got '{hex_color}'")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return r, g, b, 255


def adjust_color(hex_color, factor):
    rgba = hex_to_rgba(hex_color)
    if rgba is None:
        return None
    r, g, b, a = rgba
    r = max(0, min(255, int(r * factor)))
    g = max(0, min(255, int(g * factor)))
    b = max(0, min(255, int(b * factor)))
    return r, g, b, a


def paint_pixels(image, name, palette, pixels):
    height = len(pixels)
    if height == 0:
        raise ValueError(f"Sprite '{name}' has no pixel rows")

    width = len(pixels[0])
    expected_width, expected_height = image.size
    if width != expected_width or height != expected_height:
        raise ValueError(
            f"Sprite '{name}' must be {expected_width}x{expected_height}, got {width}x{height}"
        )

    for y, row in enumerate(pixels):
        if len(row) != width:
            raise ValueError(f"Row {y} in sprite '{name}' has invalid width {len(row)}")
        for x, value in enumerate(row):
            color_spec = palette.get(value)
            if color_spec is None:
                continue
            color = color_spec if isinstance(color_spec, tuple) else hex_to_rgba(color_spec)
            image.putpixel((x, y), color)


def save_sprite(definition):
    size = definition.get("size", DEFAULT_SIZE)
    image = Image.new('RGBA', size, (0, 0, 0, 0))

    if "pixels" in definition:
        paint_pixels(image, definition["name"], definition["palette"], definition["pixels"])
    elif "painter" in definition:
        definition["painter"](image)
    else:
        raise ValueError(f"Sprite '{definition['name']}' lacks pixel data or painter")

    output_dir = ASSETS_DIR / definition.get("category", "misc")
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{definition['name']}.png"
    image.save(out_path)
    print(f"Saved {out_path.relative_to(BASE_DIR)}")


def add_outline(draw, image, color="#101829"):
    width, height = image.size
    draw.rectangle([0, 0, width - 1, height - 1], outline=hex_to_rgba(color))


def draw_tile_floor(image):
    draw = ImageDraw.Draw(image)
    base = hex_to_rgba("#1f2840")
    accent = hex_to_rgba("#242c45")
    highlight = hex_to_rgba("#68c4ff")

    draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=base)
    for y in range(0, image.height, 4):
        for x in range(0, image.width, 4):
            draw.rectangle([x, y, min(x + 2, image.width - 1), min(y + 2, image.height - 1)], fill=accent)
            if x + 2 < image.width and y + 2 < image.height:
                draw.point((x + 2, y + 2), fill=highlight)

    add_outline(draw, image)


def draw_tile_wall(image):
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=hex_to_rgba("#101829"))
    draw.rectangle([1, 1, image.width - 2, image.height - 2], fill=hex_to_rgba("#1b2336"))

    for x in range(2, image.width - 2, 4):
        draw.rectangle([x, 1, x + 1, image.height - 2], fill=hex_to_rgba("#242f4d"))
        draw.point((x, 4), fill=hex_to_rgba("#68c4ff"))
        draw.point((x + 1, image.height - 5), fill=hex_to_rgba("#ffd27f"))

    draw.rectangle([1, 1, image.width - 2, 3], fill=hex_to_rgba("#2f3d60"))
    draw.rectangle([1, image.height - 4, image.width - 2, image.height - 2], fill=hex_to_rgba("#141b2b"))

    add_outline(draw, image)


def make_switch_painter(active):
    def painter(image):
        draw = ImageDraw.Draw(image)
        draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=hex_to_rgba("#101829"))
        draw.rectangle([1, 1, image.width - 2, image.height - 2], fill=hex_to_rgba("#1f2840"))
        draw.rectangle([3, 3, image.width - 4, image.height - 4], fill=hex_to_rgba("#242b3d"))

        center_color = "#68c4ff" if active else "#424c70"
        draw.rectangle([5, 5, image.width - 6, image.height - 6], fill=hex_to_rgba(center_color))
        draw.rectangle([6, 6, image.width - 7, image.height - 7], fill=hex_to_rgba("#f4f7ff" if active else "#2a3042"))

        if active:
            draw.point((image.width // 2, 4), fill=hex_to_rgba("#f4f7ff"))
            draw.point((image.width - 4, image.height // 2), fill=hex_to_rgba("#f4f7ff"))

        add_outline(draw, image)

    return painter


def make_door_painter(main_hex):
    def painter(image):
        draw = ImageDraw.Draw(image)
        draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=hex_to_rgba("#101829"))
        draw.rectangle([1, 1, image.width - 2, image.height - 2], fill=hex_to_rgba("#1f2840"))
        draw.rectangle([3, 2, image.width - 4, image.height - 2], fill=hex_to_rgba(main_hex))
        draw.rectangle([3, 2, image.width - 4, 4], fill=adjust_color(main_hex, 1.2))
        draw.rectangle([3, image.height - 4, image.width - 4, image.height - 2], fill=adjust_color(main_hex, 0.8))
        draw.line([(4, image.height // 2), (image.width - 5, image.height // 2)], fill=adjust_color(main_hex, 0.7))
        draw.rectangle([image.width - 6, image.height // 2, image.width - 5, image.height // 2 + 1], fill=hex_to_rgba("#ffd27f"))

        add_outline(draw, image)

    return painter


def draw_box(image):
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=hex_to_rgba("#101829"))
    draw.rectangle([1, 1, image.width - 2, image.height - 2], fill=hex_to_rgba("#5f4320"))
    draw.rectangle([2, 2, image.width - 3, image.height - 3], fill=hex_to_rgba("#8f7346"))
    draw.line([(2, 2), (image.width - 3, image.height - 3)], fill=hex_to_rgba("#b58a52"))
    draw.line([(image.width - 3, 2), (2, image.height - 3)], fill=hex_to_rgba("#b58a52"))
    draw.line([(2, image.height // 2), (image.width - 3, image.height // 2)], fill=hex_to_rgba("#704f29"))
    draw.rectangle([3, 3, image.width - 4, image.height - 4], outline=hex_to_rgba("#1f2840"))

    add_outline(draw, image)


def draw_resource_wood(image):
    draw = ImageDraw.Draw(image)
    outline = hex_to_rgba("#1f2840")
    draw.rectangle([3, 4, image.width - 4, 7], fill=hex_to_rgba("#9c774d"), outline=outline)
    draw.rectangle([2, 8, image.width - 5, 11], fill=hex_to_rgba("#8f9c4d"), outline=outline)
    draw.rectangle([4, 5, 5, 6], fill=hex_to_rgba("#ffd27f"))
    draw.rectangle([3, 9, 4, 10], fill=hex_to_rgba("#ffd27f"))


def draw_resource_ore(image):
    draw = ImageDraw.Draw(image)
    outline = hex_to_rgba("#1f2840")
    draw.polygon([(8, 3), (12, 6), (11, 11), (5, 13), (3, 8)], fill=hex_to_rgba("#4a7cb5"), outline=outline)
    draw.polygon([(8, 4), (11, 6), (10, 10), (6, 11), (4, 8)], fill=hex_to_rgba("#68c4ff"), outline=outline)
    draw.point((9, 5), fill=hex_to_rgba("#f4f7ff"))


def draw_item_torch(image):
    draw = ImageDraw.Draw(image)
    outline = hex_to_rgba("#1f2840")
    draw.rectangle([7, 5, 8, 11], fill=hex_to_rgba("#9c774d"), outline=outline)
    draw.rectangle([6, 11, 9, 13], fill=hex_to_rgba("#5a3a1e"), outline=outline)
    draw.polygon([(8, 3), (10, 6), (8, 8), (6, 6)], fill=hex_to_rgba("#ffd27f"), outline=outline)
    draw.polygon([(8, 4), (9, 6), (8, 7), (7, 6)], fill=hex_to_rgba("#ff9b3d"))


def make_key_painter(color_hex):
    def painter(image):
        draw = ImageDraw.Draw(image)
        outline = hex_to_rgba("#1f2840")
        body = hex_to_rgba(color_hex)

        draw.rectangle([4, 6, 10, 9], fill=body, outline=outline)
        draw.rectangle([6, 4, 8, 11], fill=body, outline=outline)
        draw.rectangle([10, 7, 13, 9], fill=body, outline=outline)
        draw.rectangle([2, 7, 4, 9], fill=body, outline=outline)
        draw.rectangle([5, 7, 6, 8], fill=hex_to_rgba("#101829"))
        draw.point((11, 6), fill=hex_to_rgba("#f4f7ff"))

    return painter


def draw_event(image):
    draw = ImageDraw.Draw(image)
    outline = hex_to_rgba("#1f2840")
    draw.polygon([(8, 2), (10, 6), (14, 7), (10, 9), (8, 13), (6, 9), (2, 7), (6, 6)], fill=hex_to_rgba("#ffd27f"), outline=outline)
    draw.polygon([(8, 3), (9, 6), (12, 7), (9, 8), (8, 11), (7, 8), (4, 7), (7, 6)], fill=hex_to_rgba("#fff3b0"))


def draw_hud_panel(image):
    draw = ImageDraw.Draw(image)
    for y in range(image.height):
        factor = 0.7 + (y / max(1, image.height)) * 0.4
        draw.line([(0, y), (image.width - 1, y)], fill=adjust_color("#101829", factor))
    draw.rectangle([1, 1, image.width - 2, image.height - 2], outline=hex_to_rgba("#334870"))


def draw_hud_dialog(image):
    draw = ImageDraw.Draw(image)
    for y in range(image.height):
        factor = 0.9 + (y / max(1, image.height)) * 0.3
        draw.line([(0, y), (image.width - 1, y)], fill=adjust_color("#111b31", factor))
    draw.rectangle([1, 1, image.width - 2, image.height - 2], outline=hex_to_rgba("#68c4ff"))


def draw_door_opened(image):
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, image.width - 1, image.height - 1], fill=hex_to_rgba("#101829"))
    draw.rectangle([2, 1, image.width - 3, image.height - 2], fill=hex_to_rgba("#111b31"))
    draw.rectangle([4, 2, image.width - 5, image.height - 2], fill=hex_to_rgba("#1f324b"))
    draw.rectangle([5, 3, image.width - 6, image.height - 2], fill=hex_to_rgba("#68c4ff"))
    for y in range(3, image.height - 1, 2):
        draw.line([(6, y), (image.width - 7, y)], fill=hex_to_rgba("#f4f7ff"))
    add_outline(draw, image)


SPRITES = [
    {
        "name": "player",
        "category": "characters",
        "palette": {
            0: None,
            1: "#1f2840",
            2: "#4a7cb5",
            3: "#ffd27f",
            4: "#f4f7ff",
            5: "#6fffc4",
        },
        "pixels": [
            [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 2, 4, 4, 4, 4, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 4, 3, 3, 3, 3, 4, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 5, 5, 2, 2, 5, 5, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {
        "name": "loop_warden",
        "category": "characters",
        "palette": {
            0: None,
            1: "#4a7cb5",
            2: "#1f2840",
            3: "#ffd27f",
            4: "#e0b874",
        },
        "pixels": [
            [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0],
            [0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
        ],
    },
    {
        "name": "atrium_scavenger",
        "category": "characters",
        "palette": {
            0: None,
            1: "#2a3042",
            2: "#8f9c4d",
            3: "#ffd27f",
            4: "#f0f4ff",
            5: "#ffb347",
        },
        "pixels": [
            [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 3, 3, 4, 3, 3, 4, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 5, 5, 2, 2, 5, 5, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {
        "name": "byte_smith",
        "category": "characters",
        "palette": {
            0: None,
            1: "#1f2840",
            2: "#4ab55b",
            3: "#b54a4a",
            4: "#ffd27f",
        },
        "pixels": [
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
            [0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 1, 1, 0],
            [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
            [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
            [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
            [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
            [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
            [0, 1, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 0, 0, 4, 0, 0, 4, 0, 0, 1, 1, 1, 0],
            [1, 1, 1, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1],
            [1, 1, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 1, 1],
        ],
    },
    {
        "name": "npc",
        "category": "characters",
        "palette": {
            0: None,
            1: "#1f2840",
            2: "#4a7cb5",
            3: "#ffd27f",
            4: "#f4f7ff",
            5: "#68c4ff",
        },
        "pixels": [
            [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 3, 3, 4, 3, 3, 4, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 5, 5, 2, 2, 5, 5, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {
        "name": "enemy",
        "category": "characters",
        "palette": {
            0: None,
            1: "#1f2840",
            2: "#bf3f5a",
            3: "#ffd27f",
            4: "#68c4ff",
        },
        "pixels": [
            [0, 0, 0, 0, 2, 2, 2, 1, 1, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 4, 4, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {
        "name": "hallway_hunter",
        "category": "characters",
        "palette": {
            0: None,
            1: "#1f2840",
            2: "#bf3f5a",
            3: "#ffd27f",
            4: "#68c4ff",
        },
        "pixels": [
            [0, 0, 0, 0, 2, 2, 2, 1, 1, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 4, 4, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {
        "name": "vault_guardian",
        "category": "characters",
        "palette": {
            0: None,
            1: "#101829",
            2: "#4ab55b",
            3: "#6fffc4",
            4: "#ffd27f",
        },
        "pixels": [
            [0, 0, 0, 0, 2, 2, 2, 1, 1, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 4, 4, 3, 3, 4, 4, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 3, 4, 4, 4, 4, 4, 4, 3, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 4, 4, 4, 4, 4, 4, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
            [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
        ],
    },
    {"name": "tile-floor", "category": "tiles", "painter": draw_tile_floor},
    {"name": "tile-wall", "category": "tiles", "painter": draw_tile_wall},
    {"name": "tile-switch-off", "category": "tiles", "painter": make_switch_painter(False)},
    {"name": "tile-switch-on", "category": "tiles", "painter": make_switch_painter(True)},
    {"name": "tile-door-red", "category": "tiles", "painter": make_door_painter("#b54a4a")},
    {"name": "tile-door-blue", "category": "tiles", "painter": make_door_painter("#4a7cb5")},
    {"name": "tile-door-green", "category": "tiles", "painter": make_door_painter("#4ab55b")},
    {"name": "door-opened", "category": "tiles", "painter": draw_door_opened},
    {"name": "box", "category": "tiles", "painter": draw_box},
    {"name": "resource-wood", "category": "items", "painter": draw_resource_wood},
    {"name": "resource-ore", "category": "items", "painter": draw_resource_ore},
    {"name": "item-torch", "category": "items", "painter": draw_item_torch},
    {"name": "item-key-red", "category": "items", "painter": make_key_painter("#ff8484")},
    {"name": "item-key-blue", "category": "items", "painter": make_key_painter("#6fb5ff")},
    {"name": "item-key-green", "category": "items", "painter": make_key_painter("#6fffc4")},
    {"name": "event", "category": "items", "painter": draw_event},
    {"name": "hud-panel", "category": "ui", "size": (32, 16), "painter": draw_hud_panel},
    {"name": "hud-dialog", "category": "ui", "size": (48, 24), "painter": draw_hud_dialog},
]


if __name__ == "__main__":
    for definition in SPRITES:
        save_sprite(definition)