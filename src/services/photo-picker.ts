import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
export async function pickPhoto(camera: boolean): Promise<string | null> {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
        const message = camera ? 'Necesitamos permiso de cámara para registrar la maqueta. Puedes autorizarlo en Ajustes o seleccionar una foto.' : 'Necesitamos permiso de galería para adjuntar la evidencia de tu maqueta.';
        Alert.alert('Permiso requerido', message);
        throw new Error(message);
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: false };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled)
        return null;
    const asset = result.assets[0];
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > 1600)
        context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
    const image = await context.renderAsync();
    try {
        const output = await image.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.7, base64: true });
        if (!output.base64 || output.base64.length > 1900000)
            throw new Error('La fotografía es demasiado grande. Selecciona otra imagen.');
        return 'data:image/jpeg;base64,' + output.base64;
    }
    finally {
        image.release();
        context.release();
    }
}
