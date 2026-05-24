import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Check } from 'lucide-react'

export function Subscription() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Choose the plan that fits your needs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {['Basic', 'Premium', 'Unlimited'].map((plan, idx) => (
            <Card key={plan} className={idx === 1 ? 'border-primary border-2' : ''}>
              <CardHeader>
                <CardTitle>{plan}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-gray-900">
                    RWF {(idx + 1) * 10000}
                  </span>
                  /month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm">{(idx + 1) * 30} swaps/month</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm">24/7 Support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm">Priority Access</span>
                  </li>
                </ul>
                <Button variant={idx === 1 ? 'default' : 'outline'} className="w-full">
                  {idx === 1 ? 'Current Plan' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
