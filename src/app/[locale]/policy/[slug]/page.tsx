export default async function PolicyPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">Policy: {slug}</h1>
    </div>
  )
}
