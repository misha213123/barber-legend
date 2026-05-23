function fileToCompressedDataUrl(file, maxSize = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }

        if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function chooseImageFromDevice() {
  return new Promise((resolve) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        resolve("");
        return;
      }

      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        resolve(dataUrl);
      } catch {
        alert("Ошибка обработки изображения");
        resolve("");
      } finally {
        input.remove();
      }
    };

    document.body.appendChild(input);

    input.click();
  });
}