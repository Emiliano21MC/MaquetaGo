export async function normalizeWebPhoto(source: Blob | string): Promise<string> {
    const local = typeof source !== 'string';
    const url = local ? URL.createObjectURL(source) : source;
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('No pudimos leer esta imagen. Selecciona JPG, PNG o WebP.')); image.src = url; });
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('No se pudo preparar la fotografía.');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.7, 0.5, 0.35]) {
            const data = canvas.toDataURL('image/jpeg', quality);
            if (data.length < 1900000)
                return data;
        }
        throw new Error('La foto es demasiado grande. Elige otra imagen.');
    }
    finally {
        if (local)
            URL.revokeObjectURL(url);
    }
}
