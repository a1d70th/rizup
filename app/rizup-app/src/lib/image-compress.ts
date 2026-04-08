const MAX_SIZE = 1024 * 1024; // 1MB
const MAX_WIDTH = 1200;

export async function compressImage(file: File): Promise<File> {
  // If already small enough, return as-is
  if (file.size <= MAX_SIZE && !file.type.includes("png")) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressed = new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
              type: "image/webp",
            });
            resolve(compressed.size < file.size ? compressed : file);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
