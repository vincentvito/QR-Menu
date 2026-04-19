import { redirect } from 'next/navigation'

// /dashboard itself doesn't render anything yet — every dashboard feature
// lives in a sub-route. Once we have stats or a real home to show, this
// becomes the overview page.
export default function DashboardPage() {
  redirect('/dashboard/menus')
}
