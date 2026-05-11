import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function WorkHistory() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work History</h1>
          <p className="text-gray-600 mt-1">View completed maintenance tasks</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Work history log</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
