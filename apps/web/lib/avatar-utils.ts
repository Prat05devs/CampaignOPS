const maxAvatarFileSize = 5 * 1024 * 1024;
const avatarSize = 256;

export async function fileToAvatarDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > maxAvatarFileSize) {
    throw new Error("Profile image must be smaller than 5 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, Math.floor((image.naturalWidth - cropSize) / 2));
  const sourceY = Math.max(0, Math.floor((image.naturalHeight - cropSize) / 2));
  const canvas = document.createElement("canvas");
  canvas.width = avatarSize;
  canvas.height = avatarSize;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to prepare this profile image.");
  }

  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, avatarSize, avatarSize);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load this image."));
    image.src = src;
  });
}
