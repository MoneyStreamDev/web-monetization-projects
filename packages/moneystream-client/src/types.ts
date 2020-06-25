export interface GraphQlResponse<T> {
  data: T
}

export interface MoneystreamUser {
  id: string
  fullName: string
  customerId?: string
  subscription?: {
    active: boolean
    endDate?: string
    trialEndDate?: string
  }
  currencyPreferences?: {
    code: string
    scale: number
  }
}
