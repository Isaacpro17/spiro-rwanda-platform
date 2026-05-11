import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function TechnicianDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Technician Dashboard</h1>
          <p className="text-gray-600 mt-1">Your maintenance tasks overview</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Task overview and assignments</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
