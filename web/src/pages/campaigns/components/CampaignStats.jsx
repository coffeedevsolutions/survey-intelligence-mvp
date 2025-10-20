import { BarChart3, CheckCircle2, Users } from '../../../components/ui/icons';

/**
 * Campaign statistics overview component
 */
export function CampaignStats({ campaigns }) {
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.is_active).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <StatCard
        title="Total Campaigns"
        value={totalCampaigns}
        icon={BarChart3}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      
      <StatCard
        title="Active Campaigns"
        value={activeCampaigns}
        icon={CheckCircle2}
        iconBg="bg-green-500/10"
        iconColor="text-green-600"
      />
      
      <StatCard
        title="Total Responses"
        value="--"
        icon={Users}
        iconBg="bg-purple-500/10"
        iconColor="text-purple-600"
      />
    </div>
  );
}

/**
 * Individual stat card component
 */
function StatCard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="surface card-pad">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
