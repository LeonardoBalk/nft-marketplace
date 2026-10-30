const ETH_DECIMALS = 18

export function ethToWei(value: string): bigint {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value)) throw new Error('Valor ETH inválido')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 10n ** BigInt(ETH_DECIMALS) + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
}
