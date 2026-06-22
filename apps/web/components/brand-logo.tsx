export function BrandLogo({
  className = "h-10 w-10",
  imageClassName = "h-full w-full"
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#10141A] ${className}`}
    >
      <img alt="" className={`object-cover ${imageClassName}`} src="/CampaignOPSlogo.png" />
    </span>
  );
}
