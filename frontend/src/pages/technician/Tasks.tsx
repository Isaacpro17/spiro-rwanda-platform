import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function Tasks() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Tasks</h1>
          <p className="text-gray-600 mt-1">View and manage assigned tasks</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Task list and management</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
