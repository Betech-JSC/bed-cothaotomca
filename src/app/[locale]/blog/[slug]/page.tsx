export default async function BlogDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">Blog Post: {slug}</h1>
    </div>
  )
}
