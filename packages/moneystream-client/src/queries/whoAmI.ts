import { MoneystreamUser } from '../types'
import { GraphQlClient } from '..'

export interface WhoAmIData {
  whoami: MoneystreamUser
}

export const whoamiQuery = `{
  whoami {
    id
    fullName
    customerId
    canTip

    subscription {
      active
      endDate
      trialEndDate
    }

    currencyPreferences {
      code
      scale
    }
  }
}`

export async function whoAmI(this: GraphQlClient, token: string) {
  return this.query<WhoAmIData>({ query: whoamiQuery, token })
}
