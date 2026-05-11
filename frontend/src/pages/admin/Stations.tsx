import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function Stations() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Station Management</h1>
          <p className="text-gray-600 mt-1">Manage charging stations network</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Stations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Station management interface</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
