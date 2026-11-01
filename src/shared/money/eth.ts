const ETH_DECIMALS = 18

export function ethToWei(value: string): bigint {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value)) throw new Error('Valor ETH inválido')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 10n ** BigInt(ETH_DECIMALS) + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
}

/** Present ETH without converting the decimal string to a floating-point number. */
export function formatEth(value: string | undefined): string {
  const [whole, fraction = ''] = (value ?? '0').split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
