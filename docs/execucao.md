# Execução — WorkForceManagement

Plano de referência: `plano.md` (mesma pasta).

## Status

- [x] 1.1 Adicionar `lastNotifiedDate` em `SettingsRow` (`src/db/database.ts`)
- [x] 1.2 Reescrever `checkDuty()` para notificar só hoje, uma vez por dia (`src/composables/useNotifications.ts`)
- [x] 1.3 Remover import não usado (`addDays`)
- [x] 2.1 Corrigir layout dos campos de hora em `DayPunchForm.vue`
- [x] 2.2 Corrigir `.shift-fields` em `DayDetailSheet.vue`
- [x] 3.1 Type check (`npx vue-tsc --noEmit`): sem erros
- [x] 3.2 Testes (`npx vitest run`): 3 arquivos, 45 testes passando
- [ ] 3.3 Validação visual em 360px (pendente com o usuário)

## Decisões assumidas

- Férias, feriado sem categoria de trabalho/folga e dia sem escala: nenhuma notificação.
- Envio na primeira abertura do dia, não em horário fixo.
- `ScaleEditor.vue` (`.jf`) tem o mesmo padrão de layout, mas não foi alterado (fora da tela de calendário).

## Log

- Notificações: o bloco "Amanhã você trabalha" foi removido. Agora `checkDuty()` retorna cedo se `lastNotifiedDate` for hoje e grava a data após enviar.
- Layout: `.fields` virou grid `minmax(0, 1fr) auto minmax(0, 1fr)` e os inputs de hora ganharam `min-width: 0`.
- Validação visual não feita aqui; confirmar no aparelho ou em DevTools com viewport de 360px.
