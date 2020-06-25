import { MoneystreamUser } from '../types'
import { GraphQlClient } from '..'

export interface QueryTokenData {
  refreshToken: { token: string }
  whoami: MoneystreamUser
}

export const queryTokenQuery = `{
  refreshToken {
    token
  }

  whoami {
    id
    fullName
    customerId
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

export async function queryToken(this: GraphQlClient, token: string) {
  return this.query<QueryTokenData>({ query: queryTokenQuery, token })
}
