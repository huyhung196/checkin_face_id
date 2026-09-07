import os
from PIL import Image, ImageDraw

ICONS_DIR = os.path.join(os.path.dirname(__file__), "frontend", "public", "icons")
os.makedirs(ICONS_DIR, exist_ok=True)

def create_pwa_icon(size, filename):
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rectangle
    margin = int(size * 0.05)
    radius = int(size * 0.22)
    
    # Draw soft shadow / gradient-like background
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(255, 255, 255, 245),
        outline=(253, 105, 0, 180),
        width=int(max(2, size * 0.02))
    )
    
    # Draw Camera / Face biometric HUD icon in center
    cx, cy = size // 2, size // 2
    r_outer = int(size * 0.28)
    r_inner = int(size * 0.16)
    
    # Outer circle (Orange)
    draw.ellipse(
        [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer],
        outline=(253, 105, 0, 255),
        width=int(max(3, size * 0.035))
    )
    
    # Inner circle (Royal Blue)
    draw.ellipse(
        [cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner],
        fill=(0, 106, 255, 255)
    )
    
    # Face dot highlights
    dot_r = int(size * 0.04)
    draw.ellipse([cx - dot_r, cy - int(size * 0.05) - dot_r, cx + dot_r, cy - int(size * 0.05) + dot_r], fill=(255, 255, 255, 255))
    
    # Target corner brackets
    c_len = int(size * 0.12)
    c_w = int(max(3, size * 0.03))
    pad = int(size * 0.16)
    
    # Top-Left
    draw.line([pad, pad, pad + c_len, pad], fill=(253, 105, 0, 255), width=c_w)
    draw.line([pad, pad, pad, pad + c_len], fill=(253, 105, 0, 255), width=c_w)
    # Top-Right
    draw.line([size - pad, pad, size - pad - c_len, pad], fill=(253, 105, 0, 255), width=c_w)
    draw.line([size - pad, pad, size - pad, pad + c_len], fill=(253, 105, 0, 255), width=c_w)
    # Bottom-Left
    draw.line([pad, size - pad, pad + c_len, size - pad], fill=(0, 106, 255, 255), width=c_w)
    draw.line([pad, size - pad, pad, size - pad - c_len], fill=(0, 106, 255, 255), width=c_w)
    # Bottom-Right
    draw.line([size - pad, size - pad, size - pad - c_len, size - pad], fill=(0, 106, 255, 255), width=c_w)
    draw.line([size - pad, size - pad, size - pad, size - pad - c_len], fill=(0, 106, 255, 255), width=c_w)

    out_path = os.path.join(ICONS_DIR, filename)
    img.save(out_path, "PNG")
    print(f"Created {filename} at {out_path}")

create_pwa_icon(192, "icon-192.png")
create_pwa_icon(512, "icon-512.png")
create_pwa_icon(180, "apple-touch-icon.png")
create_pwa_icon(64, "favicon.png")
