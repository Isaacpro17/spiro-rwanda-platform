import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function Maintenance() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-gray-600 mt-1">Report and track maintenance issues</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Active Maintenance Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Maintenance request management</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
