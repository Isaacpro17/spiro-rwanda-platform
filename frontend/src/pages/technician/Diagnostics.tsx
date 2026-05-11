import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function Diagnostics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Battery Diagnostics</h1>
          <p className="text-gray-600 mt-1">Run battery health checks</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Battery diagnostic interface</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
