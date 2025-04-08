<template>
  <div class="animated-toggle">
    <label class="toggle-container" :for="id">
      <input 
        type="checkbox" 
        :id="id"
        :checked="modelValue" 
        @change="$emit('update:modelValue', $event.target.checked)" 
        class="sr-only"
      />
      <div class="toggle">
        <div class="toggle-track">
          <div class="toggle-indicator">
            <div class="checkMark">
              <svg viewBox="0 0 24 24" class="checkMark-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <span v-if="label" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
        {{ label }}
      </span>
    </label>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: 'toggle'
  }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.animated-toggle {
  display: flex;
  align-items: center;
}

.toggle-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle {
  position: relative;
}

.toggle-track {
  width: 55px;
  height: 28px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  padding: 3px;
  background-color: #e2e8f0;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
}

.toggle-track::before {
  content: '';
  position: absolute;
  width: 110%;
  height: 110%;
  top: -5%;
  left: -5%;
  background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0) 70%);
  transform: scale(0);
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}

.toggle-indicator {
  width: 22px;
  height: 22px;
  background-color: white;
  border-radius: 24px;
  transition: transform 0.5s cubic-bezier(0.075, 0.82, 0.165, 1),
              box-shadow 0.3s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.toggle-indicator::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.15);
  transform: scale(0);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(input:checked) + .toggle .toggle-track {
  background-color: #3b82f6;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}

:deep(input:checked) + .toggle .toggle-track::before {
  transform: scale(1);
}

:deep(input:checked) + .toggle .toggle-indicator {
  transform: translateX(27px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

:deep(input:checked) + .toggle .toggle-indicator::before {
  transform: scale(1.8);
}

.checkMark {
  color: #3b82f6;
  font-size: 0.75rem;
  line-height: 1;
  opacity: 0;
  transform: scale(0) rotate(-45deg);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transition-delay: 0.1s;
}

.checkMark-icon {
  width: 12px;
  height: 12px;
  fill: #3b82f6;
}

:deep(input:checked) + .toggle .checkMark {
  opacity: 1;
  transform: scale(1) rotate(0);
}

:deep(input:focus) + .toggle .toggle-track,
.toggle-container:hover .toggle-track {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Dark mode */
:deep(.dark) .toggle-track {
  background-color: #475569;
}

:deep(.dark) .toggle-indicator {
  background-color: #cbd5e1;
}

:deep(.dark input:checked) + .toggle .toggle-track {
  background-color: #3b82f6;
}

:deep(.dark) .checkMark-icon {
  fill: #2563eb;
}

/* Disabled state */
:deep(input:disabled) + .toggle .toggle-track {
  background-color: #e2e8f0;
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(input:disabled) + .toggle .toggle-indicator {
  background-color: #f1f5f9;
}

:deep(.dark input:disabled) + .toggle .toggle-track {
  background-color: #475569;
  opacity: 0.6;
}
</style>