from PIL import Image
import math

def calculate_brightness(image):
    """Calculates the average brightness of visible pixels."""
    # Convert to RGBA if not already
    img = image.convert("RGBA")
    grayscale = img.convert("L")
    histogram = grayscale.histogram()
    pixels = sum(histogram)
    brightness = scale = len(histogram)

    total_brightness = 0
    count = 0
    
    width, height = img.size
    for x in range(width):
        for y in range(height):
            r, g, b, a = img.getpixel((x, y))
            if a > 0: # Only count non-transparent pixels
                # Standard luminance formula
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                total_brightness += lum
                count += 1
                
    if count == 0: return 0
    return total_brightness / count

def main():
    try:
        img = Image.open("logo.png")
        brightness = calculate_brightness(img)
        print(f"Logo Brightness: {brightness}")

        # Determine background color
        # Brighter > 128 -> Use Dark Background
        # Darker <= 128 -> Use White Background
        if brightness > 128:
            bg_color = (11, 14, 20, 255) # Dark #0B0E14
            print("Detected Light Logo -> Using Dark Background")
        else:
            bg_color = (255, 255, 255, 255) # White
            print("Detected Dark Logo -> Using White Background")

        # Create background
        bg = Image.new("RGBA", img.size, bg_color)
        
        # Determine position to center (if sizes differed, but here we match size)
        # Using alpha_composite for correct blending
        
        # Center the logo (if we wanted to make a square share image, e.g. 1200x630)
        # Social media share images are typically 1200x630.
        # Let's make a proper social card size!
        target_size = (1200, 630)
        final_bg = Image.new("RGBA", target_size, bg_color)
        
        # Resize logo to fit nicely within 1200x630 with padding
        # Max height 400, Max width 1000
        logo_w, logo_h = img.size
        aspect = logo_w / logo_h
        
        new_h = 400
        new_w = int(new_h * aspect)
        
        if new_w > 1000:
            new_w = 1000
            new_h = int(new_w / aspect)
            
        resized_logo = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center calculation
        x = (target_size[0] - new_w) // 2
        y = (target_size[1] - new_h) // 2
        
        final_bg.paste(resized_logo, (x, y), resized_logo)
        
        final_bg.save("logo-share.png")
        print("Successfully created logo-share.png")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
