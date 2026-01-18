<script setup lang="ts">
import { ref } from 'vue';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useAuth } from '@/composables/useAuth';

const { login } = useAuth();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    const success = await login(username.value, password.value);

    if (!success) {
      error.value = 'Invalid username or password';
    }
  } catch {
    error.value = 'An error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen surface-ground flex align-items-center justify-content-center px-4">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-6">
        <div
          class="logo-container w-4rem h-4rem mx-auto bg-gradient border-round-2xl flex align-items-center justify-content-center mb-4"
        >
          <img
            src="@/assets/images/bars.png"
            alt="Resonance logo"
            class="logo"
          >
        </div>
        <h1 class="text-2xl font-bold text-color">Resonance</h1>
        <p class="mt-2 text-muted">Sign in to manage your music queue</p>
      </div>

      <!-- Login Form -->
      <Card>
        <template #content>
          <form @submit.prevent="handleSubmit" class="flex flex-column gap-4">
            <!-- Error Message -->
            <Message v-if="error" severity="error" :closable="false">
              {{ error }}
            </Message>

            <!-- Username -->
            <div class="flex flex-column gap-2">
              <label for="username" class="text-sm font-medium">Username</label>
              <InputText
                id="username"
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="Enter your username"
              />
            </div>

            <!-- Password -->
            <div class="flex flex-column gap-2">
              <label for="password" class="text-sm font-medium">Password</label>
              <Password
                id="password"
                v-model="password"
                required
                autocomplete="current-password"
                placeholder="Enter your password"
                :feedback="false"
                toggle-mask
              />
            </div>

            <!-- Submit Button -->
            <Button
              type="submit"
              label="Sign In"
              :loading="loading"
              class="w-full"
            />
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.logo-container {
  background: linear-gradient(135deg, var(--primary-500, #2b2bee) 0%, #6366f1 100%);
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(43, 43, 238, 0.3);
}

.logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}
</style>
