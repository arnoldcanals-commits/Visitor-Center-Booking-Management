export default function ImagePreview({ image, close }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999]" onClick={close}>
      <img src={image} className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
    </div>
  );
}
