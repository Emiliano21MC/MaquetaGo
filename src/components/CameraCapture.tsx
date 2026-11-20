export interface CameraCaptureProps {
    open: boolean;
    onClose: () => void;
    onCapture: (uri: string) => Promise<void>;
}
export function CameraCapture(_props: CameraCaptureProps) { return null; }
