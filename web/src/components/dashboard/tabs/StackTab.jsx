import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings, BarChart3, Shield, Plus, Trash2 } from '../../ui/icons';

/**
 * Stack tab component for tech stack management
 */
export function StackTab({ 
  stackData, 
  loading, 
  onAddSystem, 
  onEditSystem, 
  onDeleteSystem,
  onAddCapability,
  onEditCapability,
  onDeleteCapability,
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy
}) {
  if (loading) {
    return (
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
        <CardContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #e5e7eb', 
              borderTop: '2px solid #3b82f6', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Loading tech stack...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e5e7eb' }}>
      <CardHeader style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <CardTitle style={{ fontSize: '20px', color: '#111827' }}>Tech Stack & Solutions</CardTitle>
            <CardDescription style={{ color: '#6b7280' }}>
              Manage your organization's tech stack for AI-powered solution recommendations
            </CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {stackData.systems.length} Systems
            </Badge>
            <Badge variant="outline" style={{ fontSize: '12px' }}>
              {stackData.capabilities.length} Capabilities
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '24px' }}>
        <Tabs defaultValue="systems" style={{ width: '100%' }}>
          <TabsList style={{ marginBottom: '24px' }}>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>
          
          {/* Systems Tab */}
          <TabsContent value="systems">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Systems & Platforms</h3>
              <Button onClick={onAddSystem} style={{ fontSize: '14px' }}>
                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Add System
              </Button>
            </div>
            
            {stackData.systems.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <Settings style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No systems configured</h4>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Add your organization's tech stack to enable AI-powered solution recommendations
                </p>
                <Button onClick={onAddSystem}>
                  <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Add Your First System
                </Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {stackData.systems.map((system) => (
                  <Card key={system.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <CardContent style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                            {system.name}
                          </h4>
                          {system.vendor && (
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                              by {system.vendor}
                            </p>
                          )}
                          {system.category && (
                            <Badge variant="outline" style={{ fontSize: '12px' }}>
                              {system.category}
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={system.status === 'active' ? 'default' : system.status === 'trial' ? 'secondary' : 'destructive'}
                          style={{ fontSize: '11px' }}
                        >
                          {system.status}
                        </Badge>
                      </div>
                      {system.notes && (
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.4' }}>
                          {system.notes}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onEditSystem(system)}
                          style={{ fontSize: '12px' }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onAddCapability(system)}
                          style={{ fontSize: '12px' }}
                        >
                          Add Capability
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onDeleteSystem(system.id)}
                          style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                        >
                          <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Capabilities Tab */}
          <TabsContent value="capabilities">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>System Capabilities</h3>
              <Button 
                onClick={() => onAddCapability(null)}
                disabled={stackData.systems.length === 0}
                style={{ fontSize: '14px' }}
              >
                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Add Capability
              </Button>
            </div>
            
            {stackData.capabilities.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <BarChart3 style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No capabilities defined</h4>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  {stackData.systems.length === 0 
                    ? 'Add systems first, then define their capabilities'
                    : 'Define what your systems can do to enable intelligent recommendations'
                  }
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stackData.capabilities.map((capability) => (
                  <Card key={capability.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <CardContent style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                              {capability.name}
                            </h4>
                            <Badge variant="outline" style={{ fontSize: '11px' }}>
                              {capability.system_name}
                            </Badge>
                          </div>
                          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.4' }}>
                            {capability.description}
                          </p>
                          {capability.domain_tags && capability.domain_tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {capability.domain_tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" style={{ fontSize: '11px' }}>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onEditCapability(capability)}
                            style={{ fontSize: '12px' }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onDeleteCapability(capability.id)}
                            style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Policies Tab */}
          <TabsContent value="policies">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Stack Policies</h3>
              <Button onClick={onAddPolicy} style={{ fontSize: '14px' }}>
                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Add Policy
              </Button>
            </div>
            
            {stackData.policies.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #d1d5db'
              }}>
                <Shield style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>No policies configured</h4>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Define policies to guide AI recommendations and solution preferences
                </p>
                <Button onClick={onAddPolicy}>
                  <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Add Your First Policy
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stackData.policies.map((policy) => (
                  <Card key={policy.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <CardContent style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                              {policy.rule_name}
                            </h4>
                            <Badge variant="outline" style={{ fontSize: '11px' }}>
                              Priority {policy.priority}
                            </Badge>
                          </div>
                          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.4' }}>
                            {policy.guidance}
                          </p>
                          {policy.applies_to_tags && policy.applies_to_tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '4px' }}>Applies to:</span>
                              {policy.applies_to_tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" style={{ fontSize: '11px' }}>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onEditPolicy(policy)}
                            style={{ fontSize: '12px' }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onDeletePolicy(policy.id)}
                            style={{ fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
