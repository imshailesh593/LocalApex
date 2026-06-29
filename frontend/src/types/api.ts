export interface BaseRecord {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface Location extends BaseRecord {
  store_name: string
  address: string
  city: string | null
  state: string | null
  country: string
  phone: string | null
  website: string | null
  gbp_location_id: string | null
  business_hours: string | null
  special_hours: string | null
  google_review_url: string | null
  funnel_slug: string | null
}

export interface Competitor extends BaseRecord {
  location_id: string
  competitor_name: string
  competitor_place_id: string | null
  track_keywords: string | null
  current_rating: number | null
  review_count: number
  map_rank: number | null
  last_synced_at: string | null
}

export interface Review extends BaseRecord {
  location_id: string
  reviewer_name: string | null
  reviewer_email: string | null
  rating: number
  comment: string | null
  is_routed: boolean
  status: 'pending' | 'routed' | 'suppressed' | 'responded'
  ai_response: string | null
  source: string
}

export interface Citation extends BaseRecord {
  location_id: string
  platform_name: string
  platform_url: string | null
  listed_name: string | null
  listed_address: string | null
  listed_phone: string | null
  status: 'unchecked' | 'consistent' | 'inconsistent' | 'missing'
  nap_match: boolean
}

export interface QAEntry extends BaseRecord {
  location_id: string
  question: string
  answer: string | null
  is_auto_answered: boolean
  is_published: boolean
  google_question_id: string | null
}

export interface Media extends BaseRecord {
  location_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: string
  gbp_media_id: string | null
  description: string | null
  is_synced: boolean
}

export interface InsightSummary {
  metric: string
  location_id: string
  total: number
}

export interface Tenant {
  id: string
  business_name: string
  plan_type: string
  status: string
  api_key: string
  notification_email: string | null
  logo_url: string | null
  created_at: string
}

export interface ResponseTemplate {
  id: string
  name: string
  body: string
  tone: string
}

export interface AuthUser {
  id: string
  tenant_id: string
  name: string
  email: string
  role: string
}
