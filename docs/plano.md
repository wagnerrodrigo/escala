# Plano — WorkForceManagement

## 1. Notificações duplicadas

**Causa:** `checkDuty()` em `src/composables/useNotifications.ts` roda a cada abertura do app (`App.vue`, `onMounted`). Ele envia "Hoje é dia de trabalho" ou "Hoje é folga" e, se amanhã for dia de trabalho, também "Amanhã você trabalha". Não há controle de "já notifiquei hoje", então se repete a cada abertura.

**Objetivo:** uma e somente uma notificação por dia, sobre o dia atual: "Hoje é dia de trabalho" ou "Hoje é folga".

**Mudanças:**
- Remover o bloco "Amanhã você trabalha".
- Adicionar `lastNotifiedDate?: string` em `SettingsRow` (`src/db/database.ts`). Campo não indexado, então não exige nova versão do Dexie.
- Em `checkDuty()`: se `settings.lastNotifiedDate === hoje`, sair. Caso contrário, notificar e gravar `lastNotifiedDate = hoje` depois do envio.
- Férias, feriado sem categoria de trabalho/folga e dia sem escala: não notificar (decisão assumida).
- `App.vue` não muda.

**Limitação:** sem servidor, a notificação sai na primeira abertura do dia, não em horário fixo.

## 2. Campo "Saída" estourando o card "Registrar jornada"

**Causa:** em `src/components/DayPunchForm.vue`, os campos usam `flex: 1` sem `min-width: 0`. O `input type="time"` tem largura mínima nativa maior que o espaço disponível em telas estreitas, então o campo "Saída" passa da borda do card.

**Mudanças:**
- `DayPunchForm.vue`: `.fields` vira grid `minmax(0, 1fr) auto minmax(0, 1fr)`; `.f` ganha `min-width: 0`; inputs de hora ganham `width: 100%` e `min-width: 0`.
- `DayDetailSheet.vue`: mesmo problema em `.shift-fields input`; adicionar `min-width: 0`.
- `ScaleEditor.vue` tem o mesmo padrão (`.jf`), mas não foi reportado e não é da tela de calendário. Fica para decisão posterior.

**Validação:** não há como ver o layout no aparelho aqui. Validar em viewport de 360px.

## Verificação geral
- `npx vue-tsc --noEmit`
- `npx vitest run`
