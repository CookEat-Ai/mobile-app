import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
const directory = (userId: string) => new Directory(Paths.document, 'cookeat-food-log', userId.replace(/[^a-zA-Z0-9_-]/g, ''));
export async function persistTrackingPhoto(userId: string, id: string, uri: string): Promise<string> {
    if (Platform.OS === 'web')
        return uri;
    const dir = directory(userId);
    dir.create({ idempotent: true, intermediates: true });
    const target = new File(dir, id.replace(/[^a-zA-Z0-9_-]/g, '') + '.jpg');
    if (target.uri === uri)
        return uri;
    await new File(uri).copy(target, { overwrite: true });
    return target.uri;
}
export function deleteTrackingPhoto(userId: string, uri?: string): void {
    if (!uri) return;
    if (Platform.OS === 'web')
        return;
    const dir = directory(userId);
    if (uri.startsWith(dir.uri.replace(/\/$/, '') + '/')) {
        const file = new File(uri);
        if (file.exists)
            file.delete();
    }
}
export function clearTrackingPhotos(userId: string): void { if (Platform.OS !== 'web') {
    const dir = directory(userId);
    if (dir.exists)
        dir.delete();
} }
