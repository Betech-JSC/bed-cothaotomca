export default async function BlogCategoryPage({
  params
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">Blog Category: {category}</h1>
    </div>
  )
}
